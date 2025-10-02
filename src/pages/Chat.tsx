import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";
import { formatDistanceToNow } from "date-fns";

interface ChatData {
  conversation_id: string;
  other_user: {
    id: string;
    username: string;
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
    chat.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gradient-accent p-6 rounded-b-3xl">
        <h1 className="text-3xl font-bold text-accent-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-8 h-8" />
          Messages
        </h1>
        <p className="text-accent-foreground/80">Stay connected with your friends</p>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-card"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <Card
              key={chat.conversation_id}
              className="p-4 rounded-2xl hover:shadow-glow-accent transition-all cursor-pointer animate-fade-in"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={chat.other_user.profile_picture_url || defaultAvatar} />
                    <AvatarFallback>{chat.other_user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate">{chat.other_user.username}</h3>
                    {chat.last_message && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.last_message?.content || "No messages yet"}
                    </p>
                    {chat.unread_count > 0 && (
                      <Badge className="bg-gradient-accent text-accent-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {chat.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No messages found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
