import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageCircle, Heart } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.png";

const chats = [
  {
    id: 1,
    username: "sarah_m",
    avatar: defaultAvatar,
    lastMessage: "Hey! Want to hang out later?",
    time: "2m",
    unread: 2,
    online: true,
    hasProposal: false,
  },
  {
    id: 2,
    username: "alex_cool",
    avatar: defaultAvatar,
    lastMessage: "That was awesome!",
    time: "1h",
    unread: 0,
    online: true,
    hasProposal: false,
  },
  {
    id: 3,
    username: "emma_art",
    avatar: defaultAvatar,
    lastMessage: "Check out my new drawing 🎨",
    time: "3h",
    unread: 1,
    online: false,
    hasProposal: true,
  },
  {
    id: 4,
    username: "mike_tech",
    avatar: defaultAvatar,
    lastMessage: "See you tomorrow!",
    time: "5h",
    unread: 0,
    online: false,
    hasProposal: false,
  },
];

const Chat = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(chat =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col pb-20">
      {/* Header */}
      <div className="bg-gradient-accent p-6 rounded-b-3xl">
        <h1 className="text-3xl font-bold text-accent-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-8 h-8" />
          Messages
        </h1>
        <p className="text-accent-foreground/80">Stay connected with your friends</p>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-card"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-2">
          {filteredChats.map((chat) => (
            <Card
              key={chat.id}
              className="p-4 rounded-2xl hover:shadow-glow-accent transition-all cursor-pointer animate-fade-in"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>{chat.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-secondary border-2 border-background rounded-full" />
                  )}
                  {chat.hasProposal && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-warm rounded-full flex items-center justify-center">
                      <Heart className="w-3 h-3 text-accent-foreground" fill="currentColor" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate">{chat.username}</h3>
                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                    {chat.unread > 0 && (
                      <Badge className="bg-gradient-accent text-accent-foreground rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredChats.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No messages found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
