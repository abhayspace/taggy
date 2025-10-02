import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, X, Loader2, Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";

interface FriendRequest {
  id: string;
  sender_id: string;
  status: string;
  created_at: string;
  sender: { username: string; profile_picture_url: string | null; bio: string | null; };
}

const Notifications = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadFriendRequests();
    const channel = supabase.channel('friend_requests_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => loadFriendRequests()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadFriendRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data, error } = await supabase.from('friend_requests').select(`id, sender_id, status, created_at, sender:profiles!sender_id (username, profile_picture_url, bio)`).eq('receiver_id', user.id).eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({ title: "Error loading requests", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
      if (error) throw error;
      toast({ title: "✨ Friend request accepted!", description: "You are now friends." });
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({ title: "Error accepting request", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId);
      if (error) throw error;
      toast({ title: "Request rejected" });
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({ title: "Error rejecting request", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gradient-pink-yellow"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="p-6 space-y-6">
        <div className="bg-gradient-pink-yellow p-6 rounded-3xl shadow-glow-rainbow card-3d animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-10 h-10 text-accent-foreground animate-bounce-subtle" />
            <h1 className="text-4xl font-extrabold text-accent-foreground">Notifications</h1>
            <Heart className="w-8 h-8 text-accent-foreground animate-bounce-subtle" fill="currentColor" />
          </div>
          <p className="text-accent-foreground/90 font-semibold text-lg">{requests.length} pending friend {requests.length === 1 ? 'request' : 'requests'} 📬</p>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="p-12 text-center rounded-3xl card-3d border-3 border-primary/20 animate-fade-in">
              <Bell className="w-16 h-16 mx-auto mb-4 text-primary animate-bounce-subtle" />
              <p className="text-foreground font-bold text-xl">No pending requests</p>
              <p className="text-muted-foreground">You're all caught up! ✨</p>
            </Card>
          ) : (
            requests.map((request, index) => (
              <Card key={request.id} className="p-5 rounded-3xl card-3d border-3 border-primary/20 shadow-glow-rainbow hover:scale-[1.02] transition-all animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border-4 border-primary/40 shadow-glow-primary">
                    <AvatarImage src={request.sender.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-2xl">{request.sender.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-xl mb-1">{request.sender.username}</h3>
                    <p className="text-base text-muted-foreground font-semibold">Wants to be your friend 🎉</p>
                    {request.sender.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{request.sender.bio}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => acceptRequest(request.id)} disabled={processingId === request.id} className="rounded-full bg-gradient-primary hover:scale-110 shadow-3d hover:shadow-3d-hover transition-all" size="sm">
                      {processingId === request.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    </Button>
                    <Button onClick={() => rejectRequest(request.id)} disabled={processingId === request.id} className="rounded-full bg-gradient-accent hover:scale-110 transition-all" size="sm">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      <div className="fixed top-28 right-8 w-10 h-10 opacity-20 pointer-events-none"><Star className="w-full h-full text-accent floating-stars" fill="currentColor" /></div>
      <div className="fixed bottom-32 left-8 w-12 h-12 opacity-15 pointer-events-none"><Heart className="w-full h-full text-primary floating-hearts" fill="currentColor" /></div>
    </div>
  );
};

export default Notifications;
