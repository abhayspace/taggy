import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
}

export const AddStoryDialog = ({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Image required",
        description: "Please provide an image URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: imageUrl.trim(),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Story added successfully",
      });

      setImageUrl("");
      onOpenChange(false);
      onStoryAdded();
    } catch (error: any) {
      toast({
        title: "Error adding story",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="story-image">Image URL</Label>
            <Input
              id="story-image"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Story will expire in 24 hours</p>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Story
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
