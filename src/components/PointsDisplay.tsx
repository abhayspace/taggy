import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const PointsDisplay = () => {
  const [points, setPoints] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadPoints();
    checkDailyBonus();

    const channel = supabase
      .channel('points-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points'
        },
        () => {
          loadPoints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPoints = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      setPoints(data?.total_points || 0);
    } catch (error) {
      console.error('Error loading points:', error);
    }
  };

  const checkDailyBonus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use atomic claim_daily_bonus function to prevent race conditions
      const { data, error } = await supabase.rpc('claim_daily_bonus');

      if (error) {
        console.error('Error claiming daily bonus:', error);
        return;
      }

      // Show toast only if bonus was successfully claimed
      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as { success: boolean; points_awarded?: number };
        toast({
          title: "Daily Bonus! 🎉",
          description: `+${result.points_awarded || 10} points for logging in today!`,
        });
        // Reload points to show updated balance
        loadPoints();
      }
    } catch (error) {
      console.error('Error checking daily bonus:', error);
    }
  };

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-full bg-background">
      <Coins className="w-4 h-4 text-foreground" />
      <span className="font-semibold text-sm text-foreground">
        {points.toLocaleString()}
      </span>
    </div>
  );
};
