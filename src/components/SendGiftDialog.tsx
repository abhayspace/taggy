import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown, Gem } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: number;
  rarity: string;
}

interface SendGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
}

export const SendGiftDialog = ({ open, onOpenChange, receiverId, receiverName }: SendGiftDialogProps) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadGifts();
      loadUserPoints();
    }
  }, [open]);

  const loadGifts = async () => {
    const { data } = await supabase
      .from('gifts')
      .select('*')
      .order('price', { ascending: true });
    
    setGifts(data || []);
  };

  const loadUserPoints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .single();

    setUserPoints(data?.total_points || 0);
  };

  const sendGift = async () => {
    if (!selectedGift) return;

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_gift', {
        _gift_id: selectedGift.id,
        _receiver_id: receiverId,
        _message: message || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; remaining_points?: number };

      if (!result.success) {
        toast({
          title: "Failed to send gift",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Gift sent! 🎁",
        description: `You sent ${selectedGift.emoji} ${selectedGift.name} to ${receiverName}!`,
      });

      setUserPoints(result.remaining_points || 0);
      setSelectedGift(null);
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
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

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return <Crown className="w-4 h-4" />;
      case 'epic': return <Gem className="w-4 h-4" />;
      case 'rare': return <Sparkles className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Send Gift to {receiverName} 🎁</span>
            <span className="text-sm font-normal text-muted-foreground">
              Your Points: <span className="font-bold text-yellow-500">{userPoints.toLocaleString()}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-3 gap-3 p-2">
            {gifts.map((gift) => {
              const canAfford = userPoints >= gift.price;
              return (
                <button
                  key={gift.id}
                  onClick={() => canAfford && setSelectedGift(gift)}
                  disabled={!canAfford}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    selectedGift?.id === gift.id
                      ? 'border-primary scale-105 shadow-lg'
                      : canAfford
                      ? 'border-border hover:scale-105 hover:border-primary/50'
                      : 'border-muted opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    {getRarityIcon(gift.rarity)}
                  </div>
                  <div className="text-4xl mb-2 animate-bounce">{gift.emoji}</div>
                  <div className="text-xs font-medium truncate">{gift.name}</div>
                  <div className={`text-xs font-bold mt-1 bg-gradient-to-r ${getRarityColor(gift.rarity)} bg-clip-text text-transparent`}>
                    {gift.price.toLocaleString()} pts
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {selectedGift && (
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{selectedGift.emoji}</span>
                <div>
                  <div className="font-bold">{selectedGift.name}</div>
                  <div className={`text-sm font-bold bg-gradient-to-r ${getRarityColor(selectedGift.rarity)} bg-clip-text text-transparent`}>
                    {selectedGift.price.toLocaleString()} points
                  </div>
                </div>
              </div>
            </div>

            <Textarea
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={200}
            />

            <Button
              onClick={sendGift}
              disabled={sending}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {sending ? "Sending..." : `Send Gift 🎁`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
