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

      const { data: userPoints } = await supabase
        .from('user_points')
        .select('last_daily_bonus')
        .eq('user_id', user.id)
        .single();

      const lastBonus = userPoints?.last_daily_bonus;
      const now = new Date();
      const lastBonusDate = lastBonus ? new Date(lastBonus) : null;

      const shouldGiveBonus = !lastBonusDate || 
        (now.getTime() - lastBonusDate.getTime()) > 24 * 60 * 60 * 1000;

      if (shouldGiveBonus) {
        await supabase.rpc('award_points', {
          _user_id: user.id,
          _points: 1,
          _action: 'daily_bonus',
          _description: 'Daily login bonus'
        });

        await supabase
          .from('user_points')
          .update({ last_daily_bonus: now.toISOString() })
          .eq('user_id', user.id);

        toast({
          title: "Daily Bonus! 🎉",
          description: "+1 point for logging in today!",
        });
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
