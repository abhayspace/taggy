import { useState } from "react";
import { Lock, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RelationshipPrivacyToggleProps {
  relationshipId: string;
  initialIsPublic: boolean;
  onUpdate?: (isPublic: boolean) => void;
}

export const RelationshipPrivacyToggle = ({
  relationshipId,
  initialIsPublic,
  onUpdate,
}: RelationshipPrivacyToggleProps) => {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('relationships')
        .update({ is_public: checked })
        .eq('id', relationshipId);

      if (error) throw error;

      setIsPublic(checked);
      onUpdate?.(checked);

      toast({
        title: "Privacy updated",
        description: checked
          ? "Your relationship is now public"
          : "Your relationship is now visible only to friends",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-card/50 rounded-2xl border border-primary/10">
      <div className="flex items-center gap-3">
        {isPublic ? (
          <Users className="w-5 h-5 text-primary" />
        ) : (
          <Lock className="w-5 h-5 text-primary" />
        )}
        <div>
          <Label htmlFor="privacy-toggle" className="font-semibold">
            {isPublic ? "Public" : "Friends Only"}
          </Label>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "Everyone can see your relationship"
              : "Only your friends can see your relationship"}
          </p>
        </div>
      </div>
      <Switch
        id="privacy-toggle"
        checked={isPublic}
        onCheckedChange={handleToggle}
        disabled={updating}
      />
    </div>
  );
};
