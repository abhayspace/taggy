import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Grid3x3, LogOut, Loader2, Plus, Bookmark, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { FriendsList } from "@/components/FriendsList";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AddPostDialog } from "@/components/AddPostDialog";
import { GiftCollectionTab } from "@/components/GiftCollectionTab";
import { RelationshipStatusBadge } from "@/components/RelationshipStatusBadge";
import { MilestonesBadges } from "@/components/MilestonesBadges";
import { MutualFriendsSuggestions } from "@/components/MutualFriendsSuggestions";
import { RelationshipPrivacyToggle } from "@/components/RelationshipPrivacyToggle";

interface Relationship {
  id: string;
  user_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;
  proposed_at: string;
  responded_at: string | null;
  status: string;
  is_public: boolean;
  partner_profile?: {
    display_name: string | null;
    username: string;
    profile_picture_url: string | null;
  };
}

interface Milestone {
  milestone_type: string;
  achieved_at: string;
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

interface Post {
  id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"posts" | "gallery" | "collection" | "gifts">("posts");
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressedPostId, setPressedPostId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [showAddPost, setShowAddPost] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

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
    loadPosts();
    loadMilestones();
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
          partner_profile:profiles!relationships_partner_id_fkey(display_name, username, profile_picture_url),
          user_profile:profiles!relationships_user_id_fkey(display_name, username, profile_picture_url)
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

  const loadMilestones = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('relationship_milestones')
        .select('*')
        .eq('user_id', profile.id)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error: any) {
      console.error('Error loading milestones:', error);
    }
  };

  // Load user's posts
  const loadPosts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', profile?.id);

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully",
      });

      loadPosts();
    } catch (error: any) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePressStart = (postId: string) => {
    const timer = setTimeout(() => {
      setPressedPostId(postId);
      if (window.confirm("Delete this post?")) {
        handleDeletePost(postId);
      }
      setPressedPostId(null);
    }, 500);
    setPressTimer(timer);
  };

  const handlePressEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
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

  const [giftsCount, setGiftsCount] = useState(0);

  useEffect(() => {
    if (profile) {
      loadGiftsCount();
    }
  }, [profile]);

  const loadGiftsCount = async () => {
    if (!profile) return;
    try {
      const { count } = await supabase
        .from('user_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id);
      setGiftsCount(count || 0);
    } catch (error) {
      console.error('Error loading gifts count:', error);
    }
  };

  const stats = {
    posts: posts.length,
    friends: friendsCount,
    collections: giftsCount,
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

        {/* Enhanced Relationship Status */}
        {relationship && relationship.status === 'accepted' && (
          <div className="space-y-4 animate-fade-in">
            <RelationshipStatusBadge
              partnerInfo={relationship.partner_profile || null}
              isPublic={relationship.is_public}
            />
            {relationship.user_id === profile.id && (
              <RelationshipPrivacyToggle
                relationshipId={relationship.id}
                initialIsPublic={relationship.is_public}
                onUpdate={loadRelationship}
              />
            )}
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <MilestonesBadges milestones={milestones} />
          </div>
        )}

        {/* Mutual Friends Suggestions */}
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <MutualFriendsSuggestions />
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
          <Card 
            onClick={() => setActiveTab("collection")}
            className="p-5 text-center rounded-2xl bg-card/50 backdrop-blur-sm border-2 border-primary/10 hover:shadow-lg transition-all hover:scale-105 animate-fade-in cursor-pointer" 
            style={{ animationDelay: '100ms' }}
          >
            <p className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-1">{stats.collections}</p>
            <p className="text-xs font-medium text-muted-foreground">Collection</p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b-2 mb-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-2 pb-4 px-2 text-xs font-medium transition-all relative ${
              activeTab === "posts"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Posts
            {activeTab === "posts" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 pb-4 px-2 text-xs font-medium transition-all relative ${
              activeTab === "gallery"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Gallery
            {activeTab === "gallery" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("collection")}
            className={`flex items-center gap-2 pb-4 px-2 text-xs font-medium transition-all relative ${
              activeTab === "collection"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Collection
            {activeTab === "collection" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === "posts" && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Grid3x3 className="w-12 h-12 text-primary" />
                </div>
                <p className="text-lg text-muted-foreground mb-4">Create your first post</p>
                <Button
                  onClick={() => setShowAddPost(true)}
                  className="rounded-full bg-gradient-primary hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => setShowAddPost(true)}
                  size="icon"
                  className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-primary hover:scale-110 transition-transform z-30"
                >
                  <Plus className="w-6 h-6" />
                </Button>
                <div className="space-y-4 pb-4">
                  {posts.map((post, i) => (
                    <div
                      key={post.id}
                      className="rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all animate-fade-in overflow-hidden"
                      style={{ animationDelay: `${i * 50}ms` }}
                      onTouchStart={() => handlePressStart(post.id)}
                      onTouchEnd={handlePressEnd}
                      onMouseDown={() => handlePressStart(post.id)}
                      onMouseUp={handlePressEnd}
                      onMouseLeave={handlePressEnd}
                    >
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt={post.caption || "Post"}
                          className="w-full object-cover"
                        />
                      )}
                      {post.caption && (
                        <div className="p-4">
                          <p className="text-foreground">{post.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "gallery" && (
          posts.filter(p => p.image_url).length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-12 h-12 text-primary" />
              </div>
              <p className="text-lg text-muted-foreground">No media posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 pb-4">
              {posts.filter(p => p.image_url).map((post, i) => (
                <div
                  key={post.id}
                  className="aspect-square rounded-2xl bg-card/50 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-all hover:scale-105 cursor-pointer animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onTouchStart={() => handlePressStart(post.id)}
                  onTouchEnd={handlePressEnd}
                  onMouseDown={() => handlePressStart(post.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                >
                  <img
                    src={post.image_url}
                    alt={post.caption || "Post"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "collection" && profile && (
          <GiftCollectionTab userId={profile.id} />
        )}
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
          <AddPostDialog
            open={showAddPost}
            onOpenChange={setShowAddPost}
            onPostAdded={loadPosts}
          />
        </>
      )}
    </div>
  );
};

export default Profile;
