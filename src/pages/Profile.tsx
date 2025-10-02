import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Grid3x3, LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { FriendsList } from "@/components/FriendsList";

interface Relationship {
  id: string;
  user_id: string;
  partner_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  partner_profile?: {
    display_name: string | null;
    username: string;
  };
}

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

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"posts" | "tagged">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [relationship, setRelationship] = useState<Relationship | null>(null);

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
    loadRelationship();
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

  const loadRelationship = async () => {
    if (!profile) return;

    try {
      const { data: relationshipData } = await supabase
        .from('relationships')
        .select(`
          *,
          partner_profile:profiles!relationships_partner_id_fkey(display_name, username),
          user_profile:profiles!relationships_user_id_fkey(display_name, username)
        `)
        .or(`user_id.eq.${profile.id},partner_id.eq.${profile.id}`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (relationshipData) {
        // Determine which profile is the partner
        const isCurrentUserTheInitiator = relationshipData.user_id === profile.id;
        setRelationship({
          ...relationshipData,
          partner_profile: isCurrentUserTheInitiator 
            ? (relationshipData as any).partner_profile 
            : (relationshipData as any).user_profile
        });
      }
    } catch (error: any) {
      console.error('Error loading relationship:', error);
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
    <div className="min-h-screen bg-background pb-20 overflow-auto">
      {/* Header with gradient and pattern */}
      <div className="relative h-48 bg-gradient-to-br from-primary via-secondary to-accent overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNHYyYzAgMiAyIDQgMiA0czIgMiA0IDJ2MmMwIDItMiA0LTIgNHMtMiAyLTQgMkg0MGMtMi0yLTItNC0yLTR2LTJjMC0yIDItNCAxLTRzMi0yIDItNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="absolute top-6 right-6 text-white hover:bg-white/20 backdrop-blur-sm rounded-full"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>

      {/* Profile Card */}
      <div className="px-6 -mt-20 relative z-10 animate-fade-in">
        <Card className="p-6 rounded-3xl bg-card/95 backdrop-blur-md border-2 border-primary/20 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-24 h-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
              <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="text-3xl bg-muted">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            <Button 
              onClick={() => setShowEditProfile(true)}
              size="sm"
              className="rounded-full bg-gradient-secondary hover:scale-105 transition-transform"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          {/* Bio and Details */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
              {profile.age && <span>{profile.age} years old</span>}
              {profile.age && profile.gender && <span>•</span>}
              {profile.gender && <span className="capitalize">{profile.gender.replace('_', ' ')}</span>}
            </p>

            {/* Relationship Status */}
            {relationship && (
              <Badge className="mb-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-2 text-sm">
                💕 In a relationship with {relationship.partner_profile?.display_name || relationship.partner_profile?.username}
              </Badge>
            )}

            <p className="text-foreground/80 mb-4 leading-relaxed">
              {profile.bio || "No bio yet ✨"}
            </p>

            {/* Interests */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 my-6">
          <Card className="p-5 text-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 hover:shadow-glow-primary transition-all hover:scale-105 animate-fade-in">
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stats.posts}</p>
            <p className="text-sm font-medium text-muted-foreground">Posts</p>
          </Card>
          <Card 
            onClick={() => setShowFriends(true)}
            className="p-5 text-center rounded-2xl bg-gradient-to-br from-secondary/10 to-secondary/5 border-2 border-secondary/20 hover:shadow-glow-secondary transition-all hover:scale-105 animate-fade-in cursor-pointer" 
            style={{ animationDelay: '50ms' }}
          >
            <p className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent mb-1">{stats.friends}</p>
            <p className="text-sm font-medium text-muted-foreground">Friends</p>
          </Card>
          <Card className="p-5 text-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/20 hover:shadow-glow-accent transition-all hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <p className="text-3xl font-bold bg-gradient-accent bg-clip-text text-transparent mb-1">{stats.stories}</p>
            <p className="text-sm font-medium text-muted-foreground">Stories</p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b-2 mb-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 pb-4 px-2 font-bold transition-all relative ${
              activeTab === "posts"
                ? "text-primary scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
            Posts
            {activeTab === "posts" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full shadow-glow-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-2 pb-4 px-2 font-bold transition-all relative ${
              activeTab === "tagged"
                ? "text-primary scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            Tagged
            {activeTab === "tagged" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full shadow-glow-primary" />
            )}
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-3 pb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 hover:from-primary/10 hover:to-secondary/10 border border-primary/10 hover:border-primary/30 transition-all hover:scale-105 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      {profile && (
        <>
          <EditProfileDialog
            open={showEditProfile}
            onOpenChange={setShowEditProfile}
            profile={profile}
            onProfileUpdated={loadProfile}
          />
          <FriendsList
            open={showFriends}
            onOpenChange={setShowFriends}
            userId={profile.id}
          />
        </>
      )}
    </div>
  );
};

export default Profile;
