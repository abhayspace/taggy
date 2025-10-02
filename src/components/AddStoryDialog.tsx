import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Image, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "./CameraCapture";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
}

export const AddStoryDialog = ({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) => {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (audio only)
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/music/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(filePath);

      setMusicUrl(publicUrl);
      
      toast({
        title: "Success",
        description: "Music uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading music",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (file: File) => {
    await uploadFile(file);
    setShowCamera(false);
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
        caption: caption.trim() || null,
        music_url: musicUrl.trim() || null,
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
      setCaption("");
      setMusicUrl("");
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
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={musicInputRef}
              onChange={handleMusicUpload}
              accept="audio/*"
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
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-32 border-dashed flex-col"
                  onClick={() => setShowCameraOptions(true)}
                  disabled={uploading}
                >
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Take Photo
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-32 border-dashed flex-col"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Image className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Choose Media
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Story will expire in 24 hours</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (Optional)</Label>
            <Input
              id="caption"
              placeholder="Add a caption to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Music (Optional)</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => musicInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {musicUrl ? "Change Music" : "Upload from Device"}
              </Button>
              <Input
                placeholder="Or paste music URL..."
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
              />
              {musicUrl && (
                <p className="text-xs text-green-500">✓ Music added</p>
              )}
            </div>
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
      
      {/* Camera Options Dialog */}
      <Dialog open={showCameraOptions} onOpenChange={setShowCameraOptions}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose Camera Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full h-16 justify-start"
              onClick={() => {
                setShowCameraOptions(false);
                setShowCamera(true);
              }}
            >
              <Camera className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">In-App Camera</div>
                <div className="text-xs text-muted-foreground">Use built-in camera with filters</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 justify-start"
              onClick={() => {
                setShowCameraOptions(false);
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Device Camera</div>
                <div className="text-xs text-muted-foreground">Use your phone's camera app</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 justify-start"
              onClick={() => {
                setShowCameraOptions(false);
                fileInputRef.current?.click();
              }}
            >
              <Image className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Other Camera Apps</div>
                <div className="text-xs text-muted-foreground">BeautyPlus, Snapchat, B612, etc.</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleCameraCapture}
      />
    </Dialog>
  );
};
