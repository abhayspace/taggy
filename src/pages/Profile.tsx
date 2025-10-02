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
  created_at: string;
  updated_at: string;
  proposed_at: string;
  responded_at: string | null;
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
        .not('responded_at', 'is', null)
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
      {/* Header */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-muted-foreground">Manage your account</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="rounded-full"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="p-6 rounded-3xl bg-card/50 backdrop-blur-sm border-2 border-primary/10 hover:shadow-glow-primary transition-all">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className="w-28 h-28 border-4 border-primary/20 shadow-lg mb-4">
              <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="text-3xl bg-gradient-primary text-primary-foreground">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-2xl font-bold mb-1">
              {profile.display_name || profile.username}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">@{profile.username}</p>

            <Button 
              onClick={() => setShowEditProfile(true)}
              size="sm"
              className="rounded-full bg-gradient-primary hover:scale-105 transition-transform"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Bio and Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground flex-wrap">
              {profile.age && <span>{profile.age} years old</span>}
              {profile.age && profile.gender && <span>•</span>}
              {profile.gender && <span className="capitalize">{profile.gender.replace('_', ' ')}</span>}
            </div>

            {/* Relationship Status */}
            {relationship && (
              <div className="flex justify-center">
                <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-2 text-sm rounded-full">
                  💕 In a relationship with {relationship.partner_profile?.display_name || relationship.partner_profile?.username}
                </Badge>
              </div>
            )}

            <p className="text-foreground/80 leading-relaxed text-center px-4">
              {profile.bio || "No bio yet ✨"}
            </p>

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
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
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5 text-center rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-primary/10 hover:shadow-lg transition-all hover:scale-105 animate-fade-in">
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stats.posts}</p>
            <p className="text-sm font-medium text-muted-foreground">Posts</p>
          </Card>
          <Card 
            onClick={() => setShowFriends(true)}
            className="p-5 text-center rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-primary/10 hover:shadow-lg transition-all hover:scale-105 animate-fade-in cursor-pointer" 
            style={{ animationDelay: '50ms' }}
          >
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stats.friends}</p>
            <p className="text-sm font-medium text-muted-foreground">Friends</p>
          </Card>
          <Card className="p-5 text-center rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-primary/10 hover:shadow-lg transition-all hover:scale-105 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stats.stories}</p>
            <p className="text-sm font-medium text-muted-foreground">Stories</p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b-2 mb-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all relative ${
              activeTab === "posts"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
            Posts
            {activeTab === "posts" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all relative ${
              activeTab === "tagged"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            Tagged
            {activeTab === "tagged" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-3 pb-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all hover:scale-105 cursor-pointer animate-fade-in"
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
