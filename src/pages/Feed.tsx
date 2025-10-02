import { useState } from "react";
import { Heart, MessageCircle, Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import defaultAvatar from "@/assets/default-avatar.png";

const stories = [
  { id: 1, username: "alex_cool", avatar: defaultAvatar, hasStory: true },
  { id: 2, username: "sarah_m", avatar: defaultAvatar, hasStory: true },
  { id: 3, username: "mike_tech", avatar: defaultAvatar, hasStory: true },
  { id: 4, username: "emma_art", avatar: defaultAvatar, hasStory: true },
  { id: 5, username: "john_music", avatar: defaultAvatar, hasStory: true },
];

const posts = [
  {
    id: 1,
    username: "sarah_m",
    avatar: defaultAvatar,
    image: defaultAvatar,
    caption: "Best day ever with my friends! 🌟",
    likes: 234,
    comments: 42,
    time: "2h ago",
  },
  {
    id: 2,
    username: "alex_cool",
    avatar: defaultAvatar,
    image: defaultAvatar,
    caption: "New adventure begins! 🚀",
    likes: 189,
    comments: 28,
    time: "5h ago",
  },
];

const Feed = () => {
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  return (
    <div className="h-full flex flex-col pb-20">
      {/* Stories Section */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4">
            <button className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-dashed border-primary">
                  <AvatarImage src={defaultAvatar} />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs font-medium">Your Story</span>
            </button>

            {stories.map((story) => (
              <button key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0">
                <Avatar className="w-16 h-16 border-2 border-primary shadow-glow-primary">
                  <AvatarImage src={story.avatar} />
                  <AvatarFallback>{story.username[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium truncate w-16 text-center">
                  {story.username}
                </span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Feed Posts */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden rounded-3xl animate-fade-in">
              {/* Post Header */}
              <div className="flex items-center gap-3 p-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.avatar} />
                  <AvatarFallback>{post.username[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{post.username}</p>
                  <p className="text-xs text-muted-foreground">{post.time}</p>
                </div>
              </div>

              {/* Post Image */}
              <div className="aspect-square bg-gradient-secondary relative">
                <img 
                  src={post.image} 
                  alt="Post" 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Post Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="transition-transform active:scale-125"
                  >
                    <Heart
                      className={`w-7 h-7 ${
                        likedPosts.includes(post.id)
                          ? "fill-accent text-accent"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                  <button className="transition-transform active:scale-110">
                    <MessageCircle className="w-7 h-7" />
                  </button>
                  <button className="transition-transform active:scale-110">
                    <Send className="w-7 h-7" />
                  </button>
                </div>

                <div>
                  <p className="font-semibold text-sm">
                    {likedPosts.includes(post.id) ? post.likes + 1 : post.likes} likes
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">{post.username}</span>{" "}
                    {post.caption}
                  </p>
                  <button className="text-sm text-muted-foreground mt-1">
                    View all {post.comments} comments
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Floating Action Button */}
      <Button 
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-accent shadow-glow-accent hover:scale-110 transition-transform z-20"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default Feed;
