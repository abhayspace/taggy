import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";

interface FriendRequest {
  id: string;
  sender_id: string;
  status: string;
  created_at: string;
  sender: {
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
    bio: string | null;
  };
}

const Notifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadFriendRequests();

    // Set up realtime subscription for new friend requests
    const channel = supabase
      .channel('friend_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        () => {
          loadFriendRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          sender_id,
          status,
          created_at,
          sender:profiles!sender_id (
            username,
            display_name,
            profile_picture_url,
            bio
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRequests(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the sender ID before accepting
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      // Award points to both users for making friends
      await supabase.rpc('award_points', {
        _user_id: user.id,
        _points: 5,
        _action: 'friend_made',
        _description: 'Accepted a friend request'
      });

      await supabase.rpc('award_points', {
        _user_id: request.sender_id,
        _points: 5,
        _action: 'friend_made',
        _description: 'Friend request accepted'
      });

      toast({
        title: "Friend request accepted! 🎉",
        description: "You are now friends. +5 points!",
      });

      // Remove from list
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({
        title: "Error accepting request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request rejected",
      });

      // Remove from list
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({
        title: "Error rejecting request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

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
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
            <Bell className="w-8 h-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {requests.length} pending friend {requests.length === 1 ? 'request' : 'requests'}
          </p>
        </div>

        {/* Friend Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl bg-card/50">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No pending friend requests</p>
            </Card>
          ) : (
            requests.map((request) => (
              <Card
                key={request.id}
                className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm hover:shadow-glow-primary transition-all animate-fade-in"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={request.sender.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {(request.sender.display_name || request.sender.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">
                      {request.sender.display_name || request.sender.username}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Wants to be your friend
                    </p>
                    {request.sender.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {request.sender.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => acceptRequest(request.id)}
                      disabled={processingId === request.id}
                      className="rounded-full bg-gradient-primary hover:scale-105 transition-transform"
                      size="sm"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => rejectRequest(request.id)}
                      disabled={processingId === request.id}
                      variant="outline"
                      className="rounded-full"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
