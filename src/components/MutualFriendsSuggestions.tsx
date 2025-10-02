import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";

interface SuggestedUser {
  id: string;
  username: string;
  display_name: string | null;
  profile_picture_url: string | null;
  mutual_count: number;
  shared_interests?: string[];
}

export const MutualFriendsSuggestions = () => {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Get user's friends
      const { data: myFriends } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (!myFriends || myFriends.length === 0) {
        setLoading(false);
        return;
      }

      const myFriendIds = myFriends.map(f => f.friend_id);

      // Get friends of friends (mutual friends)
      const { data: friendsOfFriends } = await supabase
        .from('friends')
        .select('friend_id, user_id')
        .in('user_id', myFriendIds);

      if (!friendsOfFriends) {
        setLoading(false);
        return;
      }

      // Count mutual connections and filter out existing friends
      const mutualCounts: Record<string, number> = {};
      friendsOfFriends.forEach(fof => {
        if (fof.friend_id !== user.id && !myFriendIds.includes(fof.friend_id)) {
          mutualCounts[fof.friend_id] = (mutualCounts[fof.friend_id] || 0) + 1;
        }
      });

      // Get profiles for suggested users
      const suggestedIds = Object.keys(mutualCounts).slice(0, 5);
      if (suggestedIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, profile_picture_url, interests')
        .in('id', suggestedIds);

      if (profiles) {
        const suggestionsWithMutual: SuggestedUser[] = profiles.map(p => ({
          ...p,
          mutual_count: mutualCounts[p.id],
        }));
        
        // Sort by mutual count
        suggestionsWithMutual.sort((a, b) => b.mutual_count - a.mutual_count);
        setSuggestions(suggestionsWithMutual);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Friend request sent!",
      });

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== receiverId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">People You May Know</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((user, index) => (
          <Card
            key={user.id}
            className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <Avatar
                className="w-12 h-12 border-2 border-primary/20 cursor-pointer"
                onClick={() => navigate(`/profile?user=${user.id}`)}
              >
                <AvatarImage src={user.profile_picture_url || defaultAvatar} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {(user.display_name || user.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {user.display_name || user.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.mutual_count} mutual {user.mutual_count === 1 ? 'friend' : 'friends'}
                </p>
              </div>

              <Button
                onClick={() => sendFriendRequest(user.id)}
                size="sm"
                className="rounded-full bg-gradient-primary hover:scale-110 transition-transform"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
