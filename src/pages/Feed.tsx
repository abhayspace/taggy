import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Send, Plus, Loader2, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.png";
import { AddPostDialog } from "@/components/AddPostDialog";
import { AddStoryDialog } from "@/components/AddStoryDialog";
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
    profile_picture_url: string | null;
  };
}

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    profile_picture_url: string | null;
  };
}

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAddPost, setShowAddPost] = useState(false);
  const [showAddStory, setShowAddStory] = useState(false);
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

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, profile_picture_url)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData as Post[]);

      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (username, profile_picture_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;
      setStories(storiesData as Story[]);

      const { data: likesData, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (likesError) throw likesError;
      setLikedPosts(likesData.map(like => like.post_id));

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
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) throw error;
        setLikedPosts(prev => prev.filter(id => id !== postId));
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUserId });

        if (error) throw error;
        setLikedPosts(prev => [...prev, postId]);
      }

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-cool">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pb-20 bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Stories Section */}
      <div className="bg-gradient-pink-yellow p-4 rounded-b-3xl shadow-glow-rainbow mb-4">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {/* Add Story Button */}
            <div
              onClick={() => setShowAddStory(true)}
              className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in"
            >
              <div className="relative p-1 bg-gradient-accent rounded-full shadow-glow-accent hover:scale-105 transition-all">
                <Avatar className="w-20 h-20 border-4 border-white">
                  <AvatarImage src={defaultAvatar} />
                  <AvatarFallback className="bg-gradient-primary">You</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-3 border-white shadow-3d">
                  <Plus className="w-4 h-4 text-accent-foreground" />
                </div>
              </div>
              <span className="text-sm font-bold text-accent-foreground">Your Story</span>
            </div>

            {/* User Stories */}
            {stories.map((story, index) => (
              <div
                key={story.id}
                className="flex flex-col items-center gap-2 cursor-pointer animate-fade-in hover:scale-105 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative ring-4 ring-primary ring-offset-2 ring-offset-background rounded-full p-1 shadow-glow-primary">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={story.profiles.profile_picture_url || defaultAvatar} />
                    <AvatarFallback className="bg-gradient-secondary text-secondary-foreground">
                      {story.profiles.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-sm font-bold truncate max-w-[80px]">
                  {story.profiles.username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="flex-1 overflow-auto px-4 pb-24">
        {posts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <Sparkles className="w-20 h-20 text-primary mx-auto mb-4 animate-bounce-subtle" />
            <p className="text-foreground font-bold text-xl">No posts yet</p>
            <p className="text-muted-foreground">Be the first to share something amazing!</p>
          </div>
        ) : (
          posts.map((post, index) => (
            <Card 
              key={post.id} 
              className="mb-6 rounded-3xl overflow-hidden card-3d border-4 border-primary/20 shadow-glow-rainbow animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10">
                <Avatar className="w-12 h-12 border-3 border-primary/40">
                  <AvatarImage src={post.profiles.profile_picture_url || defaultAvatar} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                    {post.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{post.profiles.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Post Image */}
              <div className="relative border-y-4 border-accent/20">
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4 bg-gradient-to-r from-secondary/10 to-accent/10">
                <div className="flex items-center gap-4 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleLike(post.id)}
                    className={`hover:scale-125 transition-all rounded-full ${
                      likedPosts.includes(post.id) ? 'animate-bounce-subtle' : ''
                    }`}
                  >
                    <Heart
                      className={`w-7 h-7 ${
                        likedPosts.includes(post.id)
                          ? "fill-primary text-primary"
                          : "text-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-125 transition-all rounded-full"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-125 transition-all rounded-full"
                  >
                    <Send className="w-7 h-7" />
                  </Button>
                </div>

                <p className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" fill="currentColor" />
                  {post.likes_count} likes
                </p>
                {post.caption && (
                  <p className="text-base mb-2">
                    <span className="font-bold mr-2">{post.profiles.username}</span>
                    {post.caption}
                  </p>
                )}
                <p className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  💬 View all {post.comments_count} comments
                </p>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <Button
        onClick={() => setShowAddPost(true)}
        className="fixed bottom-24 right-6 w-16 h-16 rounded-full shadow-3d hover:shadow-3d-hover bg-gradient-rainbow hover:scale-110 transition-all z-20 animate-bounce-subtle"
        size="icon"
      >
        <Plus className="w-8 h-8" />
      </Button>

      {/* Floating Decorative Elements */}
      <div className="fixed top-24 right-10 w-12 h-12 opacity-20 pointer-events-none">
        <Star className="w-full h-full text-accent floating-stars" fill="currentColor" />
      </div>
      <div className="fixed bottom-36 left-10 w-10 h-10 opacity-15 pointer-events-none">
        <Heart className="w-full h-full text-primary floating-hearts" fill="currentColor" />
      </div>

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
    </div>
  );
};

export default Feed;
