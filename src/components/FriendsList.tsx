import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserMinus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";

interface Friend {
  id: string;
  friend_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  };
}

interface FriendsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const FriendsList = ({ open, onOpenChange, userId }: FriendsListProps) => {
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open, userId]);

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          profiles!friends_friend_id_fkey (
            username,
            display_name,
            profile_picture_url
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setFriends(data || []);
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

  const removeFriend = async (friendshipId: string, friendId: string) => {
    setRemovingId(friendshipId);
    try {
      // Remove both directions of the friendship
      const { error: error1 } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendshipId);

      const { error: error2 } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', userId);

      if (error1 || error2) throw error1 || error2;

      setFriends(friends.filter(f => f.id !== friendshipId));
      toast({
        title: "Friend removed",
      });
    } catch (error: any) {
      toast({
        title: "Error removing friend",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Friends ({friends.length})</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No friends yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <Card key={friend.id} className="p-4 rounded-2xl bg-card/50">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={friend.profiles.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-muted">
                      {(friend.profiles.display_name || friend.profiles.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {friend.profiles.display_name || friend.profiles.username}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      @{friend.profiles.username}
                    </p>
                  </div>

                  <Button
                    onClick={() => removeFriend(friend.id, friend.friend_id)}
                    disabled={removingId === friend.id}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    {removingId === friend.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};