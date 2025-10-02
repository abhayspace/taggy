import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";

interface Friend {
  friend_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  };
}

interface StartChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StartChatDialog = ({ open, onOpenChange }: StartChatDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          profiles!friends_friend_id_fkey (
            id,
            username,
            display_name,
            profile_picture_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setFriends(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading friends",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (friendId: string) => {
    setCreating(friendId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if conversation already exists
      const { data: existingConvs, error: checkError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (checkError) throw checkError;

      // Check if any of these conversations include the friend
      for (const conv of existingConvs || []) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id);

        if (participants?.some(p => p.user_id === friendId)) {
          // Conversation exists, navigate to it
          navigate(`/conversation/${conv.conversation_id}`);
          onOpenChange(false);
          return;
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: friendId }
        ]);

      if (participantsError) throw participantsError;

      navigate(`/conversation/${newConv.id}`);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error starting conversation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(null);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.profiles.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start a Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Friends List */}
          <div className="max-h-[400px] overflow-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? "No friends found" : "No friends yet. Add some friends first!"}
              </p>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.friend_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={friend.profiles.profile_picture_url || defaultAvatar} />
                    <AvatarFallback>
                      {(friend.profiles.display_name || friend.profiles.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {friend.profiles.display_name || friend.profiles.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{friend.profiles.username}
                    </p>
                  </div>
                  <Button
                    onClick={() => startConversation(friend.friend_id)}
                    disabled={creating === friend.friend_id}
                    className="rounded-full bg-gradient-primary"
                    size="sm"
                  >
                    {creating === friend.friend_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Chat"
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
