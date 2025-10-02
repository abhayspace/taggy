import { useState } from "react";
import { Ban, Volume2, VolumeX, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BlockMuteMenuProps {
  userId: string;
  username: string;
  isBlocked?: boolean;
  isMuted?: boolean;
  onStatusChange?: () => void;
}

export const BlockMuteMenu = ({
  userId,
  username,
  isBlocked = false,
  isMuted = false,
  onStatusChange,
}: BlockMuteMenuProps) => {
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
        });

      if (error) throw error;

      toast({
        title: "User blocked",
        description: `${username} has been blocked`,
      });
      
      setShowBlockDialog(false);
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnblock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId);

      if (error) throw error;

      toast({
        title: "User unblocked",
        description: `${username} has been unblocked`,
      });
      
      setShowUnblockDialog(false);
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleMute = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isMuted) {
        const { error } = await supabase
          .from('muted_users')
          .delete()
          .eq('user_id', user.id)
          .eq('muted_user_id', userId);

        if (error) throw error;

        toast({
          title: "User unmuted",
          description: `${username} has been unmuted`,
        });
      } else {
        const { error } = await supabase
          .from('muted_users')
          .insert({
            user_id: user.id,
            muted_user_id: userId,
          });

        if (error) throw error;

        toast({
          title: "User muted",
          description: `${username} has been muted`,
        });
      }
      
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-white/20"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleToggleMute}>
            {isMuted ? (
              <>
                <Volume2 className="w-4 h-4 mr-2" />
                Unmute
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 mr-2" />
                Mute
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isBlocked ? (
            <DropdownMenuItem
              onClick={() => setShowUnblockDialog(true)}
              className="text-primary"
            >
              <Ban className="w-4 h-4 mr-2" />
              Unblock
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              className="text-destructive"
            >
              <Ban className="w-4 h-4 mr-2" />
              Block
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will no longer be able to see your posts, send you messages,
              or interact with your content. You can unblock them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Confirmation */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock {username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to see your posts and interact with your content again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
