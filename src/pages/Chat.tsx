import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MessageCircle, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";
import { formatDistanceToNow } from "date-fns";
import { StartChatDialog } from "@/components/StartChatDialog";

interface ChatData {
  conversation_id: string;
  other_user: {
    id: string;
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
}

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showStartChat, setShowStartChat] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadChats();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session) {
        loadChats();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      // Get all conversations for the user
      const { data: conversations, error: convError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations:conversation_id (
            id,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (convError) throw convError;

      if (!conversations || conversations.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // For each conversation, get the other participant and last message
      const chatsData: ChatData[] = [];
      
      for (const conv of conversations) {
        if (!conv.conversations) continue;

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
          .eq('conversation_id', conv.conversation_id)
          .neq('user_id', user.id)
          .single();

        if (participantError || !otherParticipant) continue;

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', conv.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.conversation_id)
          .eq('read', false)
          .neq('sender_id', user.id);

        chatsData.push({
          conversation_id: conv.conversation_id,
          other_user: otherParticipant.profiles as any,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
        });
      }

      setChats(chatsData);
    } catch (error: any) {
      toast({
        title: "Error loading chats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.other_user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.other_user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-br from-primary via-secondary to-accent p-6 rounded-b-[3rem] shadow-glow-primary animate-fade-in">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground flex items-center gap-3 mb-1">
              <MessageCircle className="w-10 h-10" />
              Messages
            </h1>
            <p className="text-primary-foreground/90 text-sm">Stay connected with your friends</p>
          </div>
          <Button
            onClick={() => setShowStartChat(true)}
            size="icon"
            className="rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm shadow-lg hover:scale-110 transition-all"
          >
            <Plus className="w-6 h-6 text-white" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-6 -mt-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-14 rounded-3xl bg-card/80 backdrop-blur-sm border-2 border-primary/10 focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="px-6 space-y-3">
        {filteredChats.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <p className="text-lg text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Start a conversation with your friends</p>
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <Card
              key={chat.conversation_id}
              onClick={() => navigate(`/conversation/${chat.conversation_id}`)}
              className="p-5 rounded-3xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer bg-card/50 backdrop-blur-sm border border-primary/10 animate-fade-in hover:border-primary/30"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-2 border-primary/20 shadow-md">
                    <AvatarImage src={chat.other_user.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                      {(chat.other_user.display_name || chat.other_user.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-accent rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-xs font-bold text-accent-foreground">{chat.unread_count}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg truncate">{chat.other_user.display_name || chat.other_user.username}</h3>
                    {chat.last_message && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.last_message?.content || "No messages yet"}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Start Chat Dialog */}
      <StartChatDialog
        open={showStartChat}
        onOpenChange={setShowStartChat}
      />
    </div>
  );
};

export default Chat;
