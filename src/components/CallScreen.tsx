import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Phone,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
} from 'lucide-react';
import { Call } from '@/hooks/useAgoraCalls';
import {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import defaultAvatar from '@/assets/default-avatar.png';

interface CallScreenProps {
  call: Call;
  remoteUsers: IAgoraRTCRemoteUser[];
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  otherUserInfo: {
    display_name: string | null;
    username: string;
    profile_picture_url: string | null;
  } | null;
}

export const CallScreen = ({
  call,
  remoteUsers,
  localAudioTrack,
  localVideoTrack,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  otherUserInfo,
}: CallScreenProps) => {
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Play local video
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }

    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
    };
  }, [localVideoTrack]);

  // Play remote video
  useEffect(() => {
    if (remoteUsers.length > 0 && remoteVideoRef.current) {
      const remoteUser = remoteUsers[0];
      if (remoteUser.videoTrack) {
        remoteUser.videoTrack.play(remoteVideoRef.current);
      }
    }
  }, [remoteUsers]);

  const isVideoCall = call.call_type === 'video';
  const hasRemoteUser = remoteUsers.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      {/* Remote Video/Avatar */}
      <div className="flex-1 relative">
        {isVideoCall && hasRemoteUser ? (
          <div
            ref={remoteVideoRef}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6">
            <Avatar className="w-32 h-32 border-4 border-primary shadow-2xl">
              <AvatarImage
                src={otherUserInfo?.profile_picture_url || defaultAvatar}
              />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl">
                {(otherUserInfo?.display_name || otherUserInfo?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">
                {otherUserInfo?.display_name || otherUserInfo?.username}
              </h2>
              <p className="text-muted-foreground text-lg">
                {hasRemoteUser ? 'Connected' : 'Connecting...'}
              </p>
            </div>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {isVideoCall && localVideoTrack && (
          <div className="absolute top-4 right-4 w-32 h-48 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
            <div ref={localVideoRef} className="w-full h-full" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center items-center gap-6">
          {/* Mute Audio */}
          <Button
            onClick={onToggleAudio}
            size="lg"
            variant={isAudioMuted ? 'destructive' : 'secondary'}
            className="rounded-full w-16 h-16 shadow-lg hover:scale-110 transition-transform"
          >
            {isAudioMuted ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>

          {/* End Call */}
          <Button
            onClick={onEndCall}
            size="lg"
            variant="destructive"
            className="rounded-full w-20 h-20 shadow-xl hover:scale-110 transition-transform"
          >
            <PhoneOff className="w-8 h-8" />
          </Button>

          {/* Toggle Video (only for video calls) */}
          {isVideoCall && (
            <Button
              onClick={onToggleVideo}
              size="lg"
              variant={isVideoMuted ? 'destructive' : 'secondary'}
              className="rounded-full w-16 h-16 shadow-lg hover:scale-110 transition-transform"
            >
              {isVideoMuted ? (
                <VideoOff className="w-6 h-6" />
              ) : (
                <VideoIcon className="w-6 h-6" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
