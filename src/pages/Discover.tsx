import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.png";

const suggestedUsers = [
  {
    id: 1,
    username: "jessica_art",
    avatar: defaultAvatar,
    bio: "Digital artist & designer",
    interests: ["art", "design", "photography"],
    mutualFriends: 5,
  },
  {
    id: 2,
    username: "tom_gamer",
    avatar: defaultAvatar,
    bio: "Pro gamer | Streaming daily",
    interests: ["gaming", "technology", "esports"],
    mutualFriends: 3,
  },
  {
    id: 3,
    username: "lisa_music",
    avatar: defaultAvatar,
    bio: "Music lover 🎵 Guitarist",
    interests: ["music", "guitar", "concerts"],
    mutualFriends: 8,
  },
  {
    id: 4,
    username: "david_sport",
    avatar: defaultAvatar,
    bio: "Basketball enthusiast",
    interests: ["sports", "basketball", "fitness"],
    mutualFriends: 2,
  },
];

const Discover = () => {
  const [addedFriends, setAddedFriends] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddFriend = (userId: number) => {
    setAddedFriends((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = suggestedUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.interests.some(interest => interest.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gradient-secondary p-6 rounded-b-3xl">
        <h1 className="text-3xl font-bold text-secondary-foreground mb-2 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Discover
        </h1>
        <p className="text-secondary-foreground/80">Find friends who share your interests</p>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by username or interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-card"
          />
        </div>
      </div>

      {/* Suggested Users */}
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
        {filteredUsers.map((user) => (
          <Card 
            key={user.id} 
            className="p-4 rounded-3xl hover:shadow-glow-primary transition-all animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{user.username}</h3>
                <p className="text-sm text-muted-foreground mb-2">{user.bio}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {user.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="bg-gradient-primary text-primary-foreground rounded-full px-3"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {user.mutualFriends} mutual friends
                </p>
              </div>

              <Button
                onClick={() => handleAddFriend(user.id)}
                className={`rounded-full h-10 px-6 transition-all ${
                  addedFriends.includes(user.id)
                    ? "bg-muted text-muted-foreground"
                    : "bg-gradient-accent shadow-glow-accent hover:scale-105"
                }`}
              >
                {addedFriends.includes(user.id) ? (
                  "Added"
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
