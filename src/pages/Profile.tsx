import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Heart, Users, Grid3x3, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";

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

  useEffect(() => {
    loadProfile();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session) {
        loadProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    loadFriendsCount();
  }, [profile]);

  const loadFriendsCount = async () => {
    if (!profile) return;
    
    try {
      const { count, error } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      if (error) throw error;
      setFriendsCount(count || 0);
    } catch (error: any) {
      console.error('Error loading friends count:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const stats = {
    posts: 0,
    friends: friendsCount,
    stories: 0,
  };

  return (
    <div className="h-full overflow-auto pb-20">
      {/* Header with gradient */}
      <div className="bg-gradient-primary h-32 relative">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="absolute top-4 right-4 text-primary-foreground"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      {/* Profile Info */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          <Avatar className="w-28 h-28 border-4 border-background shadow-glow-primary">
            <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
            <AvatarFallback className="text-3xl bg-gradient-primary">
              {profile.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <Button className="mb-2 rounded-full bg-gradient-secondary shadow-glow-secondary hover:scale-105 transition-transform">
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Username and Bio */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">{profile.username}</h1>
          {profile.age && (
            <p className="text-sm text-muted-foreground mb-1">{profile.age} years old</p>
          )}
          <p className="text-muted-foreground mb-3">
            {profile.bio || "No bio yet ✨"}
          </p>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.interests.map((interest) => (
                <Badge
                  key={interest}
                  className="bg-gradient-accent text-accent-foreground rounded-full px-3 py-1"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center rounded-2xl bg-card/50 backdrop-blur-sm">
            <p className="text-2xl font-bold text-primary">{stats.posts}</p>
            <p className="text-sm text-muted-foreground">Posts</p>
          </Card>
          <Card className="p-4 text-center rounded-2xl bg-card/50 backdrop-blur-sm">
            <p className="text-2xl font-bold text-secondary">{stats.friends}</p>
            <p className="text-sm text-muted-foreground">Friends</p>
          </Card>
          <Card className="p-4 text-center rounded-2xl bg-card/50 backdrop-blur-sm">
            <p className="text-2xl font-bold text-accent">{stats.stories}</p>
            <p className="text-sm text-muted-foreground">Stories</p>
          </Card>
        </div>

        {/* Relationship Status */}
        <Card className="p-4 rounded-2xl mb-6 bg-gradient-warm/10 border-accent/20">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-accent" fill="currentColor" />
            <div>
              <p className="font-semibold">Single</p>
              <p className="text-sm text-muted-foreground">Not in a relationship</p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 pb-3 px-4 font-semibold transition-colors relative ${
              activeTab === "posts"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
            Posts
            {activeTab === "posts" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-2 pb-3 px-4 font-semibold transition-colors relative ${
              activeTab === "tagged"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            Tagged
            {activeTab === "tagged" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-2 pb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-gradient-secondary/20 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
