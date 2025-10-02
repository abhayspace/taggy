import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";
import { formatDistanceToNow } from "date-fns";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversation();

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
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
            profile_picture_url
          )
        `)
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single();

      if (participantError) throw participantError;
      setOtherUser(otherParticipant.profiles as any);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('read', false);

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
      <div className="bg-gradient-to-r from-primary via-secondary to-accent p-5 flex items-center gap-4 shadow-lg animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/chat')}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {otherUser && (
          <>
            <Avatar className="w-12 h-12 border-2 border-white/50 shadow-lg">
              <AvatarImage src={otherUser.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {(otherUser.display_name || otherUser.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-bold text-white text-lg">
                {otherUser.display_name || otherUser.username}
              </h2>
              <p className="text-sm text-white/80">@{otherUser.username}</p>
            </div>
          </>
        )}
      </div>

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
                  <p className={`text-xs mt-2 ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
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
    </div>
  );
};

export default Conversation;
