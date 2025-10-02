import { Award, Heart, Users, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Milestone {
  milestone_type: string;
  achieved_at: string;
}

interface MilestonesBadgesProps {
  milestones: Milestone[];
}

const milestoneConfig: Record<string, { icon: React.ReactNode; label: string; gradient: string }> = {
  first_friend: {
    icon: <Users className="w-4 h-4" />,
    label: "First Friend",
    gradient: "from-blue-500 to-cyan-500",
  },
  first_proposal: {
    icon: <Heart className="w-4 h-4" />,
    label: "First Proposal",
    gradient: "from-pink-500 to-rose-500",
  },
  first_relationship: {
    icon: <Heart className="w-4 h-4 fill-current" />,
    label: "First Relationship",
    gradient: "from-red-500 to-pink-500",
  },
  long_term_friendship: {
    icon: <Star className="w-4 h-4" />,
    label: "Long-term Friendship",
    gradient: "from-yellow-500 to-orange-500",
  },
  popular_user: {
    icon: <Trophy className="w-4 h-4" />,
    label: "Popular User",
    gradient: "from-purple-500 to-pink-500",
  },
};

export const MilestonesBadges = ({ milestones }: MilestonesBadgesProps) => {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Milestones</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {milestones.map((milestone, index) => {
            const config = milestoneConfig[milestone.milestone_type];
            if (!config) return null;

            return (
              <Tooltip key={index}>
                <TooltipTrigger>
                  <Badge
                    className={`bg-gradient-to-r ${config.gradient} text-white border-0 shadow-lg hover:scale-110 transition-transform cursor-pointer animate-fade-in`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {config.icon}
                    <span className="ml-1">{config.label}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Achieved on {new Date(milestone.achieved_at).toLocaleDateString()}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};
