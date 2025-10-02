import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Image, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostAdded: () => void;
}

export const AddPostDialog = ({ open, onOpenChange, onPostAdded }: AddPostDialogProps) => {
  const [postType, setPostType] = useState<"post" | "note" | null>(null);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
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
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
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

  const handleMusicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingMusic(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
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
      setUploadingMusic(false);
    }
  };

  const handleSubmit = async () => {
    if (postType === "post" && !imageUrl.trim() && !caption.trim()) {
      toast({
        title: "Content required",
        description: "Please provide an image/video or caption",
        variant: "destructive",
      });
      return;
    }

    if (postType === "note" && !caption.trim()) {
      toast({
        title: "Content required",
        description: "Please write something for your note",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: imageUrl.trim() || null,
        caption: caption.trim() || null,
        music_url: musicUrl.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: postType === "post" ? "Post created successfully" : "Note created successfully",
      });

      setPostType(null);
      setCaption("");
      setImageUrl("");
      setMusicUrl("");
      onOpenChange(false);
      onPostAdded();
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setPostType(null);
        setCaption("");
        setImageUrl("");
        setMusicUrl("");
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{postType ? (postType === "post" ? "Create Post" : "Create Note") : "What do you want to share?"}</DialogTitle>
        </DialogHeader>
        
        {!postType ? (
          <div className="space-y-3 py-4">
            <Button
              onClick={() => setPostType("post")}
              className="w-full h-24 flex flex-col gap-2"
              variant="outline"
            >
              <Image className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Post</div>
                <div className="text-xs text-muted-foreground">Share photos or videos</div>
              </div>
            </Button>
            <Button
              onClick={() => setPostType("note")}
              className="w-full h-24 flex flex-col gap-2"
              variant="outline"
            >
              <Upload className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Note</div>
                <div className="text-xs text-muted-foreground">Share your thoughts</div>
              </div>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="caption">{postType === "post" ? "Caption (optional)" : "What's on your mind?"}</Label>
              <Textarea
                id="caption"
                placeholder={postType === "post" ? "Write a caption..." : "Share your thoughts..."}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
              />
            </div>
            
            {postType === "post" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="image">Image/Video</Label>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="music">Music (Optional)</Label>
                  <input
                    type="file"
                    ref={musicInputRef}
                    onChange={handleMusicUpload}
                    accept="audio/*"
                    className="hidden"
                  />
                  {musicUrl ? (
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Music className="w-5 h-5 text-primary" />
                      <span className="text-sm flex-1 truncate">Music added</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMusicUrl("")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => musicInputRef.current?.click()}
                      disabled={uploadingMusic}
                    >
                      {uploadingMusic ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Music className="w-4 h-4 mr-2" />
                      )}
                      Add Music
                    </Button>
                  )}
                </div>
              </>
            )}
            
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setPostType(null);
                  setCaption("");
                  setImageUrl("");
                }} 
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Create {postType === "post" ? "Post" : "Note"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
