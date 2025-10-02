import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Image } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images and videos)
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading file",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Media required",
        description: "Please upload an image or video",
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

      // Award points for adding story
      await supabase.rpc('award_points', {
        _user_id: user.id,
        _points: 3,
        _action: 'story_added',
        _description: 'Added a new story'
      });

      toast({
        title: "Success",
        description: "Story added successfully (+3 points)",
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
            <Label htmlFor="story-image">Image/Video</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setImageUrl("")}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Image className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Tap to select media
                    </span>
                  </div>
                )}
              </Button>
            )}
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
