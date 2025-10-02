import { useState, useEffect, useCallback } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  conversation_id: string;
  call_type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  channel_name: string;
  started_at: string;
}

export const useAgoraCalls = (currentUserId: string | null) => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const { toast } = useToast();

  // Initialize Agora client
  useEffect(() => {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    setClient(agoraClient);

    agoraClient.on('user-published', async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType);
      console.log('Subscribe success:', user.uid, mediaType);

      if (mediaType === 'video') {
        setRemoteUsers((prevUsers) => {
          if (!prevUsers.find((u) => u.uid === user.uid)) {
            return [...prevUsers, user];
          }
          return prevUsers;
        });
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    agoraClient.on('user-unpublished', (user) => {
      console.log('User unpublished:', user.uid);
      setRemoteUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    });

    agoraClient.on('user-left', (user) => {
      console.log('User left:', user.uid);
      setRemoteUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
    });

    return () => {
      agoraClient.removeAllListeners();
    };
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('calls-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newCall = payload.new as any;
          const call: Call = {
            id: newCall.id,
            caller_id: newCall.caller_id,
            receiver_id: newCall.receiver_id,
            conversation_id: newCall.conversation_id,
            call_type: newCall.call_type as 'voice' | 'video',
            status: newCall.status as Call['status'],
            channel_name: newCall.channel_name,
            started_at: newCall.started_at,
          };
          if (call.status === 'ringing') {
            setIncomingCall(call);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
        },
        (payload) => {
          const updatedCall = payload.new as any;
          const call: Call = {
            id: updatedCall.id,
            caller_id: updatedCall.caller_id,
            receiver_id: updatedCall.receiver_id,
            conversation_id: updatedCall.conversation_id,
            call_type: updatedCall.call_type as 'voice' | 'video',
            status: updatedCall.status as Call['status'],
            channel_name: updatedCall.channel_name,
            started_at: updatedCall.started_at,
          };
          if (
            (call.caller_id === currentUserId || call.receiver_id === currentUserId) &&
            (call.status === 'rejected' || call.status === 'ended')
          ) {
            endCall();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const initiateCall = async (
    receiverId: string,
    conversationId: string,
    callType: 'voice' | 'video'
  ) => {
    if (!currentUserId) return;

    const channelName = `call_${Date.now()}`;

    try {
      const { data: callData, error } = await supabase
        .from('calls')
        .insert({
          caller_id: currentUserId,
          receiver_id: receiverId,
          conversation_id: conversationId,
          call_type: callType,
          channel_name: channelName,
          status: 'ringing',
        })
        .select()
        .single();

      if (error) throw error;

      const call: Call = {
        id: callData.id,
        caller_id: callData.caller_id,
        receiver_id: callData.receiver_id,
        conversation_id: callData.conversation_id,
        call_type: callData.call_type as 'voice' | 'video',
        status: callData.status as Call['status'],
        channel_name: callData.channel_name,
        started_at: callData.started_at,
      };

      setActiveCall(call);
      toast({
        title: 'Calling...',
        description: `Initiating ${callType} call`,
      });
    } catch (error: any) {
      console.error('Error initiating call:', error);
      toast({
        title: 'Call failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const acceptCall = async (call: Call) => {
    if (!client || !currentUserId) return;

    try {
      // Update call status
      await supabase
        .from('calls')
        .update({ status: 'accepted' })
        .eq('id', call.id);

      setActiveCall(call);
      setIncomingCall(null);

      // Get Agora token from edge function
      const { data: tokenData } = await supabase.functions.invoke('generate-agora-token', {
        body: {
          channelName: call.channel_name,
          uid: currentUserId,
          role: 'publisher',
        },
      });

      if (!tokenData?.token) {
        throw new Error('Failed to get Agora token');
      }

      // Join channel
      await client.join(
        tokenData.appId,
        call.channel_name,
        tokenData.token,
        currentUserId
      );

      // Create and publish tracks
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);
      await client.publish([audioTrack]);

      if (call.call_type === 'video') {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        setLocalVideoTrack(videoTrack);
        await client.publish([videoTrack]);
      }

      toast({
        title: 'Call connected',
      });
    } catch (error: any) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Failed to join call',
        description: error.message,
        variant: 'destructive',
      });
      await rejectCall(call.id);
    }
  };

  const rejectCall = async (callId: string) => {
    try {
      await supabase
        .from('calls')
        .update({ status: 'rejected', ended_at: new Date().toISOString() })
        .eq('id', callId);

      setIncomingCall(null);
      toast({
        title: 'Call rejected',
      });
    } catch (error: any) {
      console.error('Error rejecting call:', error);
    }
  };

  const endCall = async () => {
    try {
      if (activeCall) {
        await supabase
          .from('calls')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', activeCall.id);
      }

      // Clean up tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
        setLocalAudioTrack(null);
      }

      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
        setLocalVideoTrack(null);
      }

      // Leave channel
      if (client) {
        await client.leave();
      }

      setRemoteUsers([]);
      setActiveCall(null);
      setIsAudioMuted(false);
      setIsVideoMuted(false);
    } catch (error: any) {
      console.error('Error ending call:', error);
    }
  };

  const toggleAudio = useCallback(() => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  }, [localAudioTrack, isAudioMuted]);

  const toggleVideo = useCallback(() => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  }, [localVideoTrack, isVideoMuted]);

  return {
    incomingCall,
    activeCall,
    remoteUsers,
    localAudioTrack,
    localVideoTrack,
    isAudioMuted,
    isVideoMuted,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };
};
