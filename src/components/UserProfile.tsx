import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserPlus, UserCheck, UserMinus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  profile_picture_url: string | null;
  interests: string[] | null;
}

interface UserProfileProps {
  userId: string;
  onClose: () => void;
}

export const UserProfile = ({ userId, onClose }: UserProfileProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Check if already friends
      const { data: friendData } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_id', userId)
        .single();

      setIsFriend(!!friendData);

      // Check for pending request
      const { data: requestData } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('sender_id', user.id)
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .single();

      if (requestData) {
        setFriendRequestId(requestData.id);
        setHasPendingRequest(true);
      }

      // Load friends count
      const { count } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setFriendsCount(count || 0);

    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: userId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setFriendRequestId(data.id);
      setHasPendingRequest(true);

      toast({
        title: "Friend request sent!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendRequestId) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', friendRequestId);

      if (error) throw error;

      setFriendRequestId(null);
      setHasPendingRequest(false);

      toast({
        title: "Request cancelled",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeFriend = async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', currentUserId)
        .eq('friend_id', userId);

      if (error) throw error;

      setIsFriend(false);
      toast({
        title: "Friend removed",
      });
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-auto">
      {/* Header */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-secondary to-accent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNHYyYzAgMiAyIDQgMiA0czIgMiA0IDJ2MmMwIDItMiA0LTIgNHMtMiAyLTQgMkg0MGMtMi0yLTItNC0yLTR2LTJjMC0yIDItNCAxLTRzMi0yIDItNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <Button
          onClick={onClose}
          variant="ghost"
          className="absolute top-6 left-6 text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
      </div>

      {/* Profile Card */}
      <div className="px-6 -mt-20 relative z-10 animate-fade-in">
        <Card className="p-6 rounded-3xl bg-card/95 backdrop-blur-md border-2 border-primary/20 shadow-2xl">
          <div className="flex items-end gap-5 mb-6">
            <Avatar className="w-32 h-32 border-4 border-background shadow-2xl ring-4 ring-primary/20">
              <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="bg-muted text-4xl">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            {isFriend ? (
              <Button 
                onClick={removeFriend}
                variant="outline"
                className="mb-2 rounded-full"
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Remove Friend
              </Button>
            ) : hasPendingRequest ? (
              <Button 
                onClick={cancelFriendRequest}
                variant="outline"
                className="mb-2 rounded-full"
              >
                Request Sent
              </Button>
            ) : (
              <Button 
                onClick={sendFriendRequest}
                className="mb-2 rounded-full bg-gradient-primary hover:scale-105 transition-transform shadow-lg px-6"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Friend
              </Button>
            )}
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <span className="text-primary">@{profile.username}</span>
              {profile.age && (
                <>
                  <span>•</span>
                  <span>{profile.age} years old</span>
                </>
              )}
              {profile.gender && (
                <>
                  <span>•</span>
                  <span className="capitalize">{profile.gender.replace('_', ' ')}</span>
                </>
              )}
            </p>
            <p className="text-foreground/80 mb-4 leading-relaxed">
              {profile.bio || "No bio yet ✨"}
            </p>

            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <Badge
                    key={interest}
                    className="bg-gradient-accent text-accent-foreground rounded-full px-4 py-1.5 shadow-sm animate-fade-in hover:scale-105 transition-transform"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <Card className="p-5 text-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{friendsCount}</p>
            <p className="text-sm font-medium text-muted-foreground">Friends</p>
          </Card>
          <Card className="p-5 text-center rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20">
            <p className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent mb-1">0</p>
            <p className="text-sm font-medium text-muted-foreground">Posts</p>
          </Card>
        </div>
      </div>
    </div>
  );
};