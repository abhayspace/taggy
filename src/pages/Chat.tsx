import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, Loader2, Heart, Star } from "lucide-react";
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

      const chatsData: ChatData[] = [];
      
      for (const conv of conversations) {
        if (!conv.conversations) continue;

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

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', conv.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

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
      <div className="h-screen flex items-center justify-center bg-gradient-blue-pink">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-20 bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Header */}
      <div className="bg-gradient-blue-pink p-6 rounded-b-3xl shadow-glow-rainbow mb-4">
        <div className="flex items-center gap-3 mb-3">
          <MessageCircle className="w-10 h-10 text-secondary-foreground" />
          <h1 className="text-4xl font-extrabold text-secondary-foreground animate-fade-in">
            Messages
          </h1>
          <Heart className="w-8 h-8 text-secondary-foreground animate-bounce-subtle" fill="currentColor" />
        </div>
        <p className="text-secondary-foreground/90 font-semibold text-lg">Stay connected with your besties 💬</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-14 rounded-3xl bg-card border-3 border-primary/30 focus:border-primary transition-all shadow-glow-primary text-lg"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredChats.map((chat, index) => (
            <Card
              key={chat.conversation_id}
              className="p-5 rounded-3xl hover:shadow-glow-rainbow transition-all cursor-pointer card-3d border-3 border-secondary/20 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 border-3 border-primary/40 shadow-glow-primary">
                    <AvatarImage src={chat.other_user.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-gradient-secondary text-secondary-foreground font-bold text-xl">
                      {chat.other_user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-background" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg truncate">{chat.other_user.username}</h3>
                    {chat.last_message && (
                      <span className="text-xs text-muted-foreground font-semibold">
                        {formatDistanceToNow(new Date(chat.last_message.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-base text-muted-foreground truncate">
                      {chat.last_message?.content || "No messages yet"}
                    </p>
                    {chat.unread_count > 0 && (
                      <Badge className="bg-gradient-primary text-primary-foreground rounded-full min-w-[24px] h-6 flex items-center justify-center font-bold shadow-glow-primary animate-bounce-subtle">
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
          <div className="text-center py-16 animate-fade-in">
            <MessageCircle className="w-20 h-20 text-primary mx-auto mb-4 animate-bounce-subtle" />
            <p className="text-foreground font-bold text-xl">No messages found</p>
            <p className="text-muted-foreground">Start chatting with your friends! 💬</p>
          </div>
        )}
      </div>

      {/* Floating Decorative Elements */}
      <div className="fixed top-28 right-8 w-10 h-10 opacity-20 pointer-events-none">
        <Star className="w-full h-full text-accent floating-stars" fill="currentColor" />
      </div>
      <div className="fixed bottom-32 left-8 w-12 h-12 opacity-15 pointer-events-none">
        <Heart className="w-full h-full text-secondary floating-hearts" fill="currentColor" />
      </div>
    </div>
  );
};

export default Chat;
