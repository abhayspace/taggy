import { Heart, Lock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import defaultAvatar from "@/assets/default-avatar.png";

interface RelationshipStatusBadgeProps {
  partnerInfo: {
    username: string;
    display_name: string | null;
    profile_picture_url: string | null;
  } | null;
  isPublic: boolean;
  relationshipType?: string;
}

export const RelationshipStatusBadge = ({
  partnerInfo,
  isPublic,
  relationshipType = "In a relationship",
}: RelationshipStatusBadgeProps) => {
  if (!partnerInfo) return null;

  return (
    <div className="bg-gradient-to-r from-pink-500/20 via-red-500/20 to-rose-500/20 rounded-3xl p-6 border-2 border-pink-500/30 shadow-lg animate-fade-in backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Animated Heart Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-red-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
          <Heart className="relative w-12 h-12 text-pink-500 fill-pink-500 animate-pulse" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-lg font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
              {relationshipType}
            </p>
            {!isPublic && (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-pink-500/50 shadow-md">
              <AvatarImage src={partnerInfo.profile_picture_url || defaultAvatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {(partnerInfo.display_name || partnerInfo.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {partnerInfo.display_name || partnerInfo.username}
              </p>
              <p className="text-sm text-muted-foreground">
                @{partnerInfo.username}
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Badge */}
        <Badge
          variant="outline"
          className="bg-background/50 backdrop-blur-sm border-pink-500/30"
        >
          {isPublic ? (
            <><Users className="w-3 h-3 mr-1" /> Public</>
          ) : (
            <><Lock className="w-3 h-3 mr-1" /> Friends Only</>
          )}
        </Badge>
      </div>
    </div>
  );
};
