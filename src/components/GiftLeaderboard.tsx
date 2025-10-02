import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Crown, Gift, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardUser {
  user_id: string;
  total: number;
  profile: {
    display_name: string;
    username: string;
    profile_picture_url: string | null;
  };
}

interface GiftLeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GiftLeaderboard = ({ open, onOpenChange }: GiftLeaderboardProps) => {
  const [topGifters, setTopGifters] = useState<LeaderboardUser[]>([]);
  const [topReceived, setTopReceived] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadLeaderboards();
    }
  }, [open]);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      // Top gifters
      const { data: giftersData } = await supabase
        .from('user_gifts')
        .select(`
          sender_id,
          gift:gifts(price),
          profile:profiles!user_gifts_sender_id_fkey(display_name, username, profile_picture_url)
        `);

      const giftersMap = new Map<string, { total: number; profile: any }>();
      giftersData?.forEach((item: any) => {
        const existing = giftersMap.get(item.sender_id) || { total: 0, profile: item.profile };
        existing.total += item.gift.price;
        giftersMap.set(item.sender_id, existing);
      });

      const sortedGifters = Array.from(giftersMap.entries())
        .map(([user_id, data]) => ({ user_id, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setTopGifters(sortedGifters);

      // Top receivers
      const { data: receiversData } = await supabase
        .from('user_gifts')
        .select(`
          receiver_id,
          gift:gifts(price),
          profile:profiles!user_gifts_receiver_id_fkey(display_name, username, profile_picture_url)
        `);

      const receiversMap = new Map<string, { total: number; profile: any }>();
      receiversData?.forEach((item: any) => {
        const existing = receiversMap.get(item.receiver_id) || { total: 0, profile: item.profile };
        existing.total += item.gift.price;
        receiversMap.set(item.receiver_id, existing);
      });

      const sortedReceivers = Array.from(receiversMap.entries())
        .map(([user_id, data]) => ({ user_id, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setTopReceived(sortedReceivers);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboard = (users: LeaderboardUser[]) => (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2 p-4">
        {users.map((user, index) => (
          <Card key={user.user_id} className="p-4 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-white">
                {index === 0 ? <Crown className="w-5 h-5" /> : index + 1}
              </div>
              
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.profile.profile_picture_url || undefined} />
                <AvatarFallback>{user.profile.display_name?.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="font-bold">{user.profile.display_name}</div>
                <div className="text-sm text-muted-foreground">@{user.profile.username}</div>
              </div>

              <div className="text-right">
                <div className="font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  {user.total.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Gift Leaderboard
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="gifters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gifters" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Top Gifters
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Most Gifted
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gifters">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              renderLeaderboard(topGifters)
            )}
          </TabsContent>

          <TabsContent value="received">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              renderLeaderboard(topReceived)
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
