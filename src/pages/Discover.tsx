import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, UserCheck, Loader2 } from "lucide-react";
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

      // Load all profiles except current user
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (profilesError) throw profilesError;
      setUsers(profiles || []);

      // Load friend requests
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

      // Load friends
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
        title: "Friend request sent!",
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
      <div className="h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Discover
          </h1>
          <p className="text-muted-foreground">Find friends who share your interests</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users by name or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-full bg-card/50 border-2 border-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl bg-card/50">
              <p className="text-muted-foreground">No users found</p>
            </Card>
          ) : (
            filteredUsers.map((user) => {
              const isFriend = friends.has(user.id);
              const request = friendRequests[user.id];
              const hasPendingRequest = request?.status === 'pending';

              return (
                <Card
                  key={user.id}
                  className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm hover:shadow-glow-primary transition-all animate-fade-in"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 border-2 border-primary/20">
                      <AvatarImage src={user.profile_picture_url || defaultAvatar} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{user.username}</h3>
                      {user.age && (
                        <p className="text-sm text-muted-foreground mb-1">{user.age} years old</p>
                      )}
                      {user.bio && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {/* Interests */}
                      {user.interests && user.interests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {user.interests.slice(0, 3).map((interest) => (
                            <Badge
                              key={interest}
                              className="bg-gradient-accent text-accent-foreground rounded-full text-xs"
                            >
                              {interest}
                            </Badge>
                          ))}
                          {user.interests.length > 3 && (
                            <Badge className="bg-muted text-muted-foreground rounded-full text-xs">
                              +{user.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      {isFriend ? (
                        <Button
                          disabled
                          className="rounded-full bg-gradient-secondary"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Friends
                        </Button>
                      ) : hasPendingRequest ? (
                        <Button
                          onClick={() => cancelFriendRequest(user.id)}
                          variant="outline"
                          className="rounded-full"
                        >
                          Request Sent
                        </Button>
                      ) : (
                        <Button
                          onClick={() => sendFriendRequest(user.id)}
                          className="rounded-full bg-gradient-primary hover:scale-105 transition-transform"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
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
    </div>
  );
};

export default Discover;
