import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Send, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";
import { AddPostDialog } from "@/components/AddPostDialog";
import { AddStoryDialog } from "@/components/AddStoryDialog";
import { PostCommentsDialog } from "@/components/PostCommentsDialog";
import { StoryViewer } from "@/components/StoryViewer";
import { PointsDisplay } from "@/components/PointsDisplay";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  };
  has_relationship?: boolean;
}

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  };
}

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [friendsStories, setFriendsStories] = useState<Story[]>([]);
  const [currentViewStories, setCurrentViewStories] = useState<Story[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddStory, setShowAddStory] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [usersInRelationships, setUsersInRelationships] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (session) {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      setCurrentUserId(user.id);

      // Load current user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, display_name, profile_picture_url')
        .eq('id', user.id)
        .single();
      
      setCurrentUserProfile(profileData);

      // Load posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, display_name, profile_picture_url)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData as Post[]);

      // Load stories
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (username, display_name, profile_picture_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;
      
      // Separate user's stories from friends' stories
      const myStories = (storiesData as Story[]).filter(s => s.user_id === user.id);
      const otherStories = (storiesData as Story[]).filter(s => s.user_id !== user.id);
      
      // Group friends' stories by user_id and keep only the latest one per friend
      const friendsStoriesMap = new Map<string, Story>();
      otherStories.forEach(story => {
        if (!friendsStoriesMap.has(story.user_id)) {
          friendsStoriesMap.set(story.user_id, story);
        }
      });
      
      setUserStories(myStories);
      setFriendsStories(Array.from(friendsStoriesMap.values()));

      // Load liked posts
      const { data: likesData, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (likesError) throw likesError;
      setLikedPosts(likesData.map(like => like.post_id));

      // Load users in relationships
      const { data: relationshipsData } = await supabase
        .from('relationships')
        .select('user_id, partner_id')
        .eq('status', 'accepted');

      if (relationshipsData) {
        const usersInRel = new Set<string>();
        relationshipsData.forEach(rel => {
          usersInRel.add(rel.user_id);
          usersInRel.add(rel.partner_id);
        });
        setUsersInRelationships(usersInRel);
      }

    } catch (error: any) {
      toast({
        title: "Error loading feed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      if (!currentUserId) return;

      if (likedPosts.includes(postId)) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) throw error;
        setLikedPosts(prev => prev.filter(id => id !== postId));
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUserId });

        if (error) throw error;
        setLikedPosts(prev => [...prev, postId]);
      }

      // Refresh posts to get updated like counts
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleShare = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.profiles.display_name || post.profiles.username}`,
          text: post.caption || "",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard",
        });
      }
    } catch (error: any) {
      console.error("Error sharing:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-20">
      {/* Header with Points */}
      <div className="flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm sticky top-0 z-20 border-b">
        <h1 className="text-xl font-bold text-purple-500">
          TagMate
        </h1>
        <PointsDisplay />
      </div>

      {/* Stories */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 px-4 min-w-max">
          {/* Your Story */}
          <div
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            <div className="relative">
              <div 
                className={`${userStories.length > 0 ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-background' : ''} rounded-full p-1`}
                onClick={() => {
                  if (userStories.length > 0) {
                    setCurrentViewStories(userStories);
                    setStoryIndex(0);
                    setStoryViewerOpen(true);
                  }
                }}
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage src={currentUserProfile?.profile_picture_url || defaultAvatar} />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddStory(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-accent rounded-full flex items-center justify-center border-2 border-background hover:scale-110 transition-transform"
              >
                <Plus className="w-3 h-3 text-accent-foreground" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Your Story</span>
          </div>

          {/* Friends' Stories (one per friend) */}
          {friendsStories.map((story) => (
            <div
              key={story.id}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => { 
                setCurrentViewStories([story]); 
                setStoryIndex(0); 
                setStoryViewerOpen(true); 
              }}
            >
              <div className="relative ring-2 ring-gradient-accent ring-offset-2 ring-offset-background rounded-full p-1">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={story.profiles.profile_picture_url || defaultAvatar} />
                  <AvatarFallback>{(story.profiles.display_name || story.profiles.username)[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[70px]">
                {story.profiles.display_name || story.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="flex-1 overflow-auto px-4 pb-24">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No posts yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="mb-6 rounded-3xl overflow-hidden animate-fade-in">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.profiles.profile_picture_url || defaultAvatar} />
                    <AvatarFallback>{(post.profiles.display_name || post.profiles.username)[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {usersInRelationships.has(post.user_id) && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center border-2 border-background shadow-md">
                      <Heart className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{post.profiles.display_name || post.profiles.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full aspect-square object-cover"
                />
              )}

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleLike(post.id)}
                    className="hover:scale-110 transition-transform group"
                  >
                    <Heart
                      className={`w-6 h-6 transition-all ${
                        likedPosts.includes(post.id)
                          ? "fill-red-500 text-red-500 animate-scale-in"
                          : "group-hover:scale-110"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPostForComments(post.id)}
                    className="hover:scale-110 transition-transform"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleShare(post)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Send className="w-6 h-6" />
                  </Button>
                </div>

                <p className="font-semibold mb-1">{post.likes_count} likes</p>
                {post.caption && (
                  <p className="text-sm">
                    <span className="font-semibold">{post.profiles.display_name || post.profiles.username}</span> {post.caption}
                  </p>
                )}
                <p
                  className="text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground"
                  onClick={() => setSelectedPostForComments(post.id)}
                >
                  View all {post.comments_count} comments
                </p>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowAddPost(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-glow-primary bg-gradient-primary hover:scale-110 transition-transform z-10"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Dialogs */}
      <AddPostDialog
        open={showAddPost}
        onOpenChange={setShowAddPost}
        onPostAdded={loadData}
      />
      <AddStoryDialog
        open={showAddStory}
        onOpenChange={setShowAddStory}
        onStoryAdded={loadData}
      />
      {selectedPostForComments && (
        <PostCommentsDialog
          open={!!selectedPostForComments}
          onOpenChange={(open) => !open && setSelectedPostForComments(null)}
          postId={selectedPostForComments}
        />
      )}
      {storyViewerOpen && (
      <StoryViewer
        open={storyViewerOpen}
        onOpenChange={setStoryViewerOpen}
        stories={currentViewStories}
        initialIndex={storyIndex}
      />
      )}
    </div>
  );
};

export default Feed;
