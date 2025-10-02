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
    // loadRelationship(); // Temporarily disabled until types are regenerated
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

  // const loadRelationship = async () => {
  //   if (!profile) return;

  //   try {
  //     const result: any = await supabase
  //       .from('relationships')
  //       .select('*')
  //       .or(`user_id.eq.${profile.id},partner_id.eq.${profile.id}`)
  //       .eq('status', 'accepted')
  //       .maybeSingle();

  //     if (result.error) {
  //       console.error('Error loading relationship:', result.error);
  //       return;
  //     }

  //     if (result.data) {
  //       const relationshipData = result.data;
  //       // Load partner profile separately
  //       const isCurrentUserTheInitiator = relationshipData.user_id === profile.id;
  //       const partnerId = isCurrentUserTheInitiator ? relationshipData.partner_id : relationshipData.user_id;
        
  //       const partnerResult: any = await supabase
  //         .from('profiles')
  //         .select('display_name, username')
  //         .eq('id', partnerId)
  //         .single();

  //       setRelationship({
  //         id: relationshipData.id,
  //         user_id: relationshipData.user_id,
  //         partner_id: relationshipData.partner_id,
  //         status: relationshipData.status,
  //         partner_profile: partnerResult.data || undefined
  //       });
  //     }
  //   } catch (error: any) {
  //     console.error('Error loading relationship:', error);
  //   }
  // };

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
      <div className="border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{profile.username}</h1>
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

      {/* Profile Section - Instagram Style */}
      <div className="px-6 py-6 animate-fade-in">
        {/* Avatar and Stats Row */}
        <div className="flex items-center gap-6 mb-6">
          <Avatar className="w-20 h-20 md:w-28 md:h-28 border-2 border-border">
            <AvatarImage src={profile.profile_picture_url || defaultAvatar} />
            <AvatarFallback className="text-2xl md:text-3xl bg-muted">
              {profile.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Stats */}
          <div className="flex-1 flex justify-around text-center">
            <div className="cursor-default">
              <p className="text-xl font-semibold">{stats.posts}</p>
              <p className="text-sm text-muted-foreground">posts</p>
            </div>
            <div 
              onClick={() => setShowFriends(true)}
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <p className="text-xl font-semibold">{stats.friends}</p>
              <p className="text-sm text-muted-foreground">friends</p>
            </div>
            <div className="cursor-default">
              <p className="text-xl font-semibold">{stats.stories}</p>
              <p className="text-sm text-muted-foreground">stories</p>
            </div>
          </div>
        </div>

        {/* Name and Bio */}
        <div className="mb-4">
          <h2 className="font-semibold text-sm">
            {profile.display_name || profile.username}
          </h2>
          
          {/* Age and Gender */}
          {(profile.age || profile.gender) && (
            <p className="text-sm text-muted-foreground mt-1">
              {profile.age && <span>{profile.age} years old</span>}
              {profile.age && profile.gender && <span> • </span>}
              {profile.gender && <span className="capitalize">{profile.gender.replace('_', ' ')}</span>}
            </p>
          )}

          {/* Relationship Status */}
          {relationship && (
            <p className="text-sm mt-2 flex items-center gap-1">
              <span>💕</span>
              <span>In a relationship with <span className="font-semibold">{relationship.partner_profile?.display_name || relationship.partner_profile?.username}</span></span>
            </p>
          )}

          {/* Bio */}
          <p className="text-sm mt-2 whitespace-pre-wrap">
            {profile.bio || ""}
          </p>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="rounded-md px-2 py-0.5 text-xs font-normal"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Edit Profile Button */}
        <Button 
          onClick={() => setShowEditProfile(true)}
          variant="outline"
          className="w-full rounded-lg font-semibold"
          size="sm"
        >
          Edit Profile
        </Button>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b-2 mb-6 mt-8 animate-fade-in">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all relative ${
              activeTab === "posts"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
            {activeTab === "posts" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all relative ${
              activeTab === "tagged"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <Users className="w-5 h-5" />
            {activeTab === "tagged" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </button>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square bg-muted hover:opacity-70 transition-opacity cursor-pointer"
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
