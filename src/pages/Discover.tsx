import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, UserCheck, Loader2, Heart, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  age: number | null;
  profile_picture_url: string | null;
  interests: string[] | null;
}

interface FriendRequest {
  id: string;
  status: string;
}

const Discover = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<Record<string, FriendRequest>>({});
  const [friends, setFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (profilesError) throw profilesError;
      setUsers(profiles || []);

      const { data: requests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted']);

      if (requestsError) throw requestsError;
      
      const requestsMap: Record<string, FriendRequest> = {};
      requests?.forEach(req => {
        requestsMap[req.receiver_id] = { id: req.id, status: req.status };
      });
      setFriendRequests(requestsMap);

      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendsError) throw friendsError;
      
      const friendsSet = new Set(friendsData?.map(f => f.friend_id) || []);
      setFriends(friendsSet);

    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setFriendRequests({
        ...friendRequests,
        [receiverId]: { id: data.id, status: 'pending' }
      });

      toast({
        title: "✨ Friend request sent!",
        description: "Waiting for them to accept.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelFriendRequest = async (receiverId: string) => {
    const request = friendRequests[receiverId];
    if (!request) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', request.id);

      if (error) throw error;

      const newRequests = { ...friendRequests };
      delete newRequests[receiverId];
      setFriendRequests(newRequests);

      toast({
        title: "Request cancelled",
      });
    } catch (error: any) {
      toast({
        title: "Error cancelling request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.interests?.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-rainbow">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-accent p-6 rounded-3xl shadow-glow-accent card-3d animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-10 h-10 text-accent-foreground animate-bounce-subtle" />
            <h1 className="text-4xl font-extrabold text-accent-foreground">
              Discover
            </h1>
            <Star className="w-8 h-8 text-accent-foreground animate-bounce-subtle" fill="currentColor" />
          </div>
          <p className="text-accent-foreground/90 font-semibold text-lg">Find friends who share your vibes ✨</p>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in" style={{ animationDelay: '100ms' }}>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-14 rounded-3xl bg-card border-3 border-primary/30 focus:border-primary transition-all shadow-glow-primary text-lg"
          />
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl card-3d border-3 border-primary/20 animate-fade-in">
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce-subtle" />
              <p className="text-foreground font-bold text-xl">No users found</p>
              <p className="text-muted-foreground">Try searching for something else!</p>
            </Card>
          ) : (
            filteredUsers.map((user, index) => {
              const isFriend = friends.has(user.id);
              const request = friendRequests[user.id];
              const hasPendingRequest = request?.status === 'pending';

              return (
                <Card
                  key={user.id}
                  className="p-5 rounded-3xl card-3d border-3 border-accent/20 shadow-glow-rainbow hover:scale-[1.02] transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-20 h-20 border-4 border-primary/40 shadow-glow-primary">
                      <AvatarImage src={user.profile_picture_url || defaultAvatar} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-2xl">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-xl mb-1">{user.username}</h3>
                      {user.age && (
                        <p className="text-base text-muted-foreground mb-1 font-semibold">🎂 {user.age} years old</p>
                      )}
                      {user.bio && (
                        <p className="text-base text-muted-foreground mb-3 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {/* Interests */}
                      {user.interests && user.interests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {user.interests.slice(0, 3).map((interest, i) => (
                            <Badge
                              key={interest}
                              className="bg-gradient-primary text-primary-foreground rounded-3xl text-sm px-3 py-1 font-bold shadow-glow-primary animate-scale-in"
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              {interest}
                            </Badge>
                          ))}
                          {user.interests.length > 3 && (
                            <Badge className="bg-gradient-secondary text-secondary-foreground rounded-3xl text-sm px-3 py-1 font-bold">
                              +{user.interests.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      {isFriend ? (
                        <Button
                          disabled
                          className="rounded-3xl bg-gradient-secondary shadow-glow-secondary font-bold"
                        >
                          <UserCheck className="w-5 h-5 mr-2" />
                          Friends ✨
                        </Button>
                      ) : hasPendingRequest ? (
                        <Button
                          onClick={() => cancelFriendRequest(user.id)}
                          className="rounded-3xl bg-gradient-accent hover:scale-105 transition-all font-bold"
                        >
                          Request Sent 📨
                        </Button>
                      ) : (
                        <Button
                          onClick={() => sendFriendRequest(user.id)}
                          className="rounded-3xl bg-gradient-rainbow hover:scale-105 shadow-3d hover:shadow-3d-hover transition-all font-bold"
                        >
                          <UserPlus className="w-5 h-5 mr-2" />
                          Add Friend 🎉
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Decorative Elements */}
      <div className="fixed top-24 left-8 w-12 h-12 opacity-20 pointer-events-none">
        <Heart className="w-full h-full text-primary floating-hearts" fill="currentColor" />
      </div>
      <div className="fixed bottom-32 right-8 w-10 h-10 opacity-20 pointer-events-none">
        <Star className="w-full h-full text-accent floating-stars" fill="currentColor" />
      </div>
    </div>
  );
};

export default Discover;
