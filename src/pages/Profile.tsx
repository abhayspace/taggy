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
import { SettingsDialog } from "@/components/SettingsDialog";

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
  const [showSettings, setShowSettings] = useState(false);
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
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSettings(true)}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex gap-4 items-start">
          <Avatar className="w-20 h-20 border-2 border-border">
            <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
            <AvatarFallback className="text-2xl bg-muted">
              {profile.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-semibold leading-tight">
              {profile.display_name || profile.username}
            </h2>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            
            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-foreground/90 leading-relaxed pt-2">
                {profile.bio}
              </p>
            )}

            {/* Details */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              {profile.age && <span>{profile.age} years old</span>}
              {profile.age && profile.gender && <span>•</span>}
              {profile.gender && <span className="capitalize">{profile.gender.replace('_', ' ')}</span>}
            </div>

            {/* Relationship Status */}
            {relationship && (
              <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-3 py-1 text-xs rounded-full mt-2">
                💕 In a relationship with {relationship.partner_profile?.display_name || relationship.partner_profile?.username}
              </Badge>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {profile.interests.map((interest, index) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="text-xs rounded-full px-2.5 py-0.5"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

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
          <SettingsDialog
            open={showSettings}
            onOpenChange={setShowSettings}
            onEditProfile={() => setShowEditProfile(true)}
          />
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
