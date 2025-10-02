import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Heart, Users, Grid3x3, LogOut, Loader2, Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";
import { EditProfileDialog } from "@/components/EditProfileDialog";

interface Profile {
  id: string;
  username: string;
  bio: string | null;
  age: number | null;
  profile_picture_url: string | null;
  interests: string[] | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"posts" | "tagged">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') navigate('/');
      else if (session) loadProfile();
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (profile) loadFriendsCount();
  }, [profile]);

  const loadFriendsCount = async () => {
    if (!profile) return;
    try {
      const { count } = await supabase.from('friends').select('*', { count: 'exact', head: true }).eq('user_id', profile.id);
      setFriendsCount(count || 0);
    } catch (error) {
      console.error('Error loading friends count:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({ title: "Error loading profile", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gradient-rainbow"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!profile) return <div className="h-screen flex items-center justify-center"><p className="text-muted-foreground">Profile not found</p></div>;

  return (
    <div className="h-full overflow-auto pb-20 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header */}
      <div className="bg-gradient-warm h-40 relative rounded-b-3xl shadow-glow-accent">
        <Button onClick={handleLogout} className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-3xl font-bold">
          <LogOut className="w-5 h-5 mr-2" />Logout
        </Button>
        <div className="absolute top-4 left-4"><Heart className="w-8 h-8 text-white/40 floating-hearts" fill="currentColor" /></div>
        <div className="absolute top-8 right-20"><Star className="w-6 h-6 text-white/30 floating-stars" fill="currentColor" /></div>
      </div>

      <div className="px-6 -mt-16 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          <Avatar className="w-32 h-32 border-4 border-background shadow-3d card-3d">
            <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
            <AvatarFallback className="text-4xl bg-gradient-primary font-extrabold">{profile.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <Button onClick={() => setShowEditProfile(true)} className="mb-2 rounded-3xl bg-gradient-secondary shadow-glow-secondary hover:scale-105 transition-all font-bold">
            <Settings className="w-4 h-4 mr-2" />Edit Profile
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold mb-1">{profile.username}</h1>
          {profile.age && <p className="text-base text-muted-foreground mb-1 font-semibold">🎂 {profile.age} years old</p>}
          <p className="text-muted-foreground mb-3 text-base">{profile.bio || "No bio yet ✨"}</p>
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.interests.map((interest, i) => (
                <Badge key={interest} className="bg-gradient-accent text-accent-foreground rounded-3xl px-4 py-2 font-bold shadow-glow-accent animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>{interest}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-5 text-center rounded-3xl card-3d border-3 border-primary/20 shadow-glow-primary">
            <p className="text-3xl font-extrabold text-primary">0</p>
            <p className="text-sm text-muted-foreground font-bold">Posts</p>
          </Card>
          <Card className="p-5 text-center rounded-3xl card-3d border-3 border-secondary/20 shadow-glow-secondary">
            <p className="text-3xl font-extrabold text-secondary">{friendsCount}</p>
            <p className="text-sm text-muted-foreground font-bold">Friends</p>
          </Card>
          <Card className="p-5 text-center rounded-3xl card-3d border-3 border-accent/20 shadow-glow-accent">
            <p className="text-3xl font-extrabold text-accent">0</p>
            <p className="text-sm text-muted-foreground font-bold">Stories</p>
          </Card>
        </div>

        {/* Relationship Status */}
        <Card className="p-5 rounded-3xl mb-6 bg-gradient-warm/20 border-3 border-accent/30 card-3d shadow-glow-accent">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-accent animate-bounce-subtle" fill="currentColor" />
            <div><p className="font-extrabold text-lg">Single 💫</p><p className="text-sm text-muted-foreground font-semibold">Not in a relationship</p></div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b-3 border-primary/20 mb-6">
          {[{ tab: "posts" as const, icon: Grid3x3, label: "Posts" }, { tab: "tagged" as const, icon: Users, label: "Tagged" }].map(({ tab, icon: Icon, label }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 pb-3 px-4 font-extrabold transition-all relative ${activeTab === tab ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="w-5 h-5" />{label}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full shadow-glow-primary" />}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-3 pb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gradient-secondary/30 animate-fade-in card-3d border-2 border-secondary/20" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>

      {profile && <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} profile={profile} onProfileUpdated={loadProfile} />}
    </div>
  );
};

export default Profile;
