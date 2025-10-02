import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Gift } from "lucide-react";

interface ReceivedGift {
  id: string;
  message: string | null;
  created_at: string;
  gift: {
    name: string;
    emoji: string;
    price: number;
    rarity: string;
  };
  sender: {
    display_name: string;
    username: string;
    profile_picture_url: string | null;
  };
}

interface GiftCollectionTabProps {
  userId: string;
}

export const GiftCollectionTab = ({ userId }: GiftCollectionTabProps) => {
  const [gifts, setGifts] = useState<ReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGifts();

    const channel = supabase
      .channel('gift-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_gifts',
          filter: `receiver_id=eq.${userId}`
        },
        () => {
          loadGifts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadGifts = async () => {
    try {
      const { data } = await supabase
        .from('user_gifts')
        .select(`
          id,
          message,
          created_at,
          gift:gifts(name, emoji, price, rarity),
          sender:profiles!user_gifts_sender_id_fkey(display_name, username, profile_picture_url)
        `)
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

      setGifts((data as any) || []);
    } catch (error) {
      console.error('Error loading gifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-500 to-orange-500';
      case 'epic': return 'from-purple-500 to-pink-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading gifts...</div>;
  }

  if (gifts.length === 0) {
    return (
      <div className="text-center py-12">
        <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No gifts received yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {gifts.map((gift) => (
          <Card key={gift.id} className="p-4 hover:shadow-lg transition-all animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="text-5xl animate-bounce">{gift.gift.emoji}</div>
              <div className="flex-1">
                <div className="font-bold text-lg">{gift.gift.name}</div>
                <div className={`text-sm font-bold bg-gradient-to-r ${getRarityColor(gift.gift.rarity)} bg-clip-text text-transparent mb-2`}>
                  {gift.gift.price.toLocaleString()} points
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={gift.sender.profile_picture_url || undefined} />
                    <AvatarFallback>{gift.sender.display_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    from <span className="font-medium text-foreground">{gift.sender.display_name}</span>
                  </span>
                </div>

                {gift.message && (
                  <div className="text-sm bg-muted p-2 rounded-lg italic">
                    "{gift.message}"
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(gift.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
