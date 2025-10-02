import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, MessageCircle, Heart, Gift, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";
import { formatDistanceToNow } from "date-fns";
import { SendGiftDialog } from "@/components/SendGiftDialog";
import { useAgoraCalls } from "@/hooks/useAgoraCalls";
import { IncomingCallPopup } from "@/components/IncomingCallPopup";
import { CallScreen } from "@/components/CallScreen";
import { BlockMuteMenu } from "@/components/BlockMuteMenu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface OtherUser {
  id: string;
  username: string;
  display_name: string | null;
  profile_picture_url: string | null;
  gender: string | null;
}

interface Relationship {
  id: string;
  user_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  proposed_at: string;
  responded_at: string | null;
}

const Conversation = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [canPropose, setCanPropose] = useState(false);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [proposing, setProposing] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Call functionality
  const {
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
  } = useAgoraCalls(currentUserId);

  const [incomingCallUserInfo, setIncomingCallUserInfo] = useState<OtherUser | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Load caller info when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      loadCallerInfo(incomingCall.caller_id);
    }
  }, [incomingCall]);

  const loadCallerInfo = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, profile_picture_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setIncomingCallUserInfo(data as any);
    } catch (error) {
      console.error('Error loading caller info:', error);
    }
  };

  useEffect(() => {
    loadConversation();
    loadRelationshipStatus();
    loadBlockMuteStatus();

    // Set up realtime subscription for new messages
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
          
          // Mark new message as read if it's from the other user
          if (newMsg.sender_id !== currentUserId) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Get other participant
      const { data: otherParticipant, error: participantError } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            display_name,
            profile_picture_url,
            gender
          )
        `)
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single();

      if (participantError) throw participantError;
      setOtherUser(otherParticipant.profiles as any);

      // Check if can propose
      if (otherParticipant.profiles) {
        const { data: canProposeData } = await supabase
          .rpc('can_propose_to', { _partner_id: (otherParticipant.profiles as any).id });
        setCanPropose(canProposeData || false);
      }

      // Mark messages as read immediately
      const { error: markReadError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (markReadError) {
        console.error('Error marking messages as read:', markReadError);
      }

    } catch (error: any) {
      toast({
        title: "Error loading conversation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRelationshipStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: relationshipData } = await supabase
        .from('relationships')
        .select('*')
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .maybeSingle();

      if (relationshipData) {
        setRelationship(relationshipData);
      }
    } catch (error: any) {
      console.error('Error loading relationship:', error);
    }
  };

  const loadBlockMuteStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !otherUser) return;

      // Check if blocked
      const { data: blockData } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('blocked_user_id', otherUser.id)
        .maybeSingle();

      setIsBlocked(!!blockData);

      // Check if muted
      const { data: muteData } = await supabase
        .from('muted_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('muted_user_id', otherUser.id)
        .maybeSingle();

      setIsMuted(!!muteData);
    } catch (error: any) {
      console.error('Error loading block/mute status:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: newMessage.trim(),
        });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handlePropose = async () => {
    if (!otherUser || !currentUserId) return;

    setProposing(true);
    try {
      const { error } = await supabase
        .from('relationships')
        .insert({
          user_id: currentUserId,
          partner_id: otherUser.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Proposal sent! 💝",
        description: `You've sent a relationship proposal to ${otherUser.display_name || otherUser.username}`,
      });

      await loadRelationshipStatus();
      setShowProposalDialog(false);
      setCanPropose(false);
    } catch (error: any) {
      toast({
        title: "Error sending proposal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProposing(false);
    }
  };

  const handleProposalResponse = async (accept: boolean) => {
    if (!relationship || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('relationships')
        .update({ 
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', relationship.id);

      if (error) throw error;

      toast({
        title: accept ? "Relationship accepted! 💕" : "Proposal declined",
        description: accept 
          ? "You're now in a relationship!" 
          : "You've declined the proposal",
      });

      await loadRelationshipStatus();
      setShowResponseDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-background p-5 flex items-center gap-4 border-b border-border animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/chat')}
          className="rounded-full hover:bg-accent"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <Avatar className="w-12 h-12 border-2 border-primary/20 shadow-sm">
              <AvatarImage src={otherUser.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {(otherUser.display_name || otherUser.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-foreground text-lg">
                {otherUser.display_name || otherUser.username}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{otherUser.username}
                {relationship?.responded_at && " 💕"}
              </p>
            </div>

            {/* Call Buttons */}
            <Button
              onClick={() => initiateCall(otherUser.id, conversationId!, 'voice')}
              size="sm"
              variant="ghost"
              className="rounded-full hover:bg-accent"
            >
              <Phone className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => initiateCall(otherUser.id, conversationId!, 'video')}
              size="sm"
              variant="ghost"
              className="rounded-full hover:bg-accent"
            >
              <Video className="w-4 h-4" />
            </Button>

            {/* Gift Button */}
            <Button
              onClick={() => setShowGiftDialog(true)}
              size="sm"
              variant="ghost"
              className="rounded-full hover:bg-accent"
            >
              <Gift className="w-4 h-4" />
            </Button>

            {/* Block/Mute Menu */}
            <BlockMuteMenu
              userId={otherUser.id}
              username={otherUser.username}
              isBlocked={isBlocked}
              isMuted={isMuted}
              onStatusChange={loadBlockMuteStatus}
            />

            {/* Relationship Actions */}
            {canPropose && !relationship && (
              <Button
                onClick={() => setShowProposalDialog(true)}
                size="sm"
                variant="ghost"
                className="rounded-full hover:bg-accent"
              >
                <Heart className="w-4 h-4 mr-2" />
                Propose
              </Button>
            )}
            {relationship && !relationship.responded_at && relationship.partner_id === currentUserId && (
              <Button
                onClick={() => setShowResponseDialog(true)}
                size="sm"
                variant="ghost"
                className="rounded-full bg-primary/10 hover:bg-primary/20 animate-pulse"
              >
                <Heart className="w-4 h-4 mr-2" />
                Respond
              </Button>
            )}
            {relationship && !relationship.responded_at && relationship.user_id === currentUserId && (
              <Badge variant="secondary">
                Proposal Sent
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Proposal Dialog */}
      <AlertDialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Send Relationship Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to propose a relationship with {otherUser?.display_name || otherUser?.username}? 
              They will be notified and can accept or decline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePropose} disabled={proposing}>
              {proposing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Proposal 💝"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Response Dialog */}
      <AlertDialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Relationship Proposal
            </AlertDialogTitle>
            <AlertDialogDescription>
              {otherUser?.display_name || otherUser?.username} has proposed a relationship with you! 
              Would you like to accept?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleProposalResponse(false)}>
              Decline
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleProposalResponse(true)}>
              Accept 💕
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4 bg-gradient-to-b from-background to-muted/20">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center animate-fade-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div
                  className={`max-w-[75%] rounded-3xl px-5 py-3 shadow-md ${
                    isOwn
                      ? 'bg-gradient-to-br from-primary to-secondary text-primary-foreground rounded-br-md'
                      : 'bg-card border border-primary/10 rounded-bl-md'
                  }`}
                >
                  <p className={`text-sm leading-relaxed ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {message.content}
                  </p>
                  <div className={`flex items-center gap-1 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <p className={`text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                    {isOwn && (
                      <span className={`text-xs ${message.read ? 'text-blue-400' : 'text-primary-foreground/60'}`}>
                        {message.read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-5 bg-card/50 backdrop-blur-sm border-t border-primary/10">
        <div className="flex gap-3 items-center">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="rounded-full h-12 px-6 bg-background border-2 border-primary/10 focus:border-primary transition-all"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !newMessage.trim()}
            className="rounded-full h-12 w-12 bg-gradient-to-br from-primary to-secondary hover:scale-110 transition-all shadow-lg disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </form>
      
      {/* Incoming Call Popup */}
      {incomingCall && incomingCallUserInfo && (
        <IncomingCallPopup
          call={incomingCall}
          callerInfo={incomingCallUserInfo}
          onAccept={() => acceptCall(incomingCall)}
          onReject={() => rejectCall(incomingCall.id)}
        />
      )}

      {/* Active Call Screen */}
      {activeCall && otherUser && (
        <CallScreen
          call={activeCall}
          remoteUsers={remoteUsers}
          localAudioTrack={localAudioTrack}
          localVideoTrack={localVideoTrack}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          otherUserInfo={otherUser}
        />
      )}

      {/* Send Gift Dialog */}
      {otherUser && (
        <SendGiftDialog
          open={showGiftDialog}
          onOpenChange={setShowGiftDialog}
          receiverId={otherUser.id}
          receiverName={otherUser.display_name || otherUser.username}
        />
      )}
    </div>
  );
};

export default Conversation;
