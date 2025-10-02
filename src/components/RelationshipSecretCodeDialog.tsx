import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RelationshipSecretCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: {
    id: string;
    secret_code: string | null;
    user_id: string;
  } | null;
  currentUserId: string;
  onRelationshipUpdated: () => void;
}

export const RelationshipSecretCodeDialog = ({ 
  open, 
  onOpenChange, 
  relationship, 
  currentUserId,
  onRelationshipUpdated 
}: RelationshipSecretCodeDialogProps) => {
  const [mode, setMode] = useState<"generate" | "enter">("generate");
  const [secretCode, setSecretCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSecretCode(code);
  };

  const handleGenerateCode = async () => {
    if (!relationship) return;
    
    setLoading(true);
    try {
      generateCode();
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from('relationships')
        .update({ secret_code: code })
        .eq('id', relationship.id);

      if (error) throw error;

      setSecretCode(code);
      toast({
        title: "Secret code generated",
        description: "Share this code with your partner to confirm the relationship",
      });
      
      onRelationshipUpdated();
    } catch (error: any) {
      toast({
        title: "Error generating code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnterCode = async () => {
    if (!enteredCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter the secret code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find relationship with this secret code
      const { data: relationshipData, error: findError } = await supabase
        .from('relationships')
        .select('*')
        .eq('secret_code', enteredCode.toUpperCase())
        .eq('partner_id', currentUserId)
        .maybeSingle();

      if (findError) throw findError;

      if (!relationshipData) {
        toast({
          title: "Invalid code",
          description: "The secret code is incorrect or has expired",
          variant: "destructive",
        });
        return;
      }

      // Update relationship status to accepted
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString(),
          secret_code: null // Clear the code after use
        })
        .eq('id', relationshipData.id);

      if (updateError) throw updateError;

      toast({
        title: "Relationship confirmed!",
        description: "Your relationship status is now public",
      });

      onOpenChange(false);
      onRelationshipUpdated();
    } catch (error: any) {
      toast({
        title: "Error confirming relationship",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secretCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Secret code copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Relationship Secret Code</DialogTitle>
          <DialogDescription>
            Use a secret code to confirm your relationship status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setMode("generate")}
              variant={mode === "generate" ? "default" : "outline"}
              className="flex-1"
            >
              Generate Code
            </Button>
            <Button
              onClick={() => setMode("enter")}
              variant={mode === "enter" ? "default" : "outline"}
              className="flex-1"
            >
              Enter Code
            </Button>
          </div>

          {mode === "generate" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generate a secret code for your partner</Label>
                {secretCode ? (
                  <div className="flex items-center gap-2">
                    <Input value={secretCode} readOnly className="font-mono text-lg" />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateCode}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Generate Secret Code
                  </Button>
                )}
              </div>
              {secretCode && (
                <p className="text-sm text-muted-foreground">
                  Share this code with your partner so they can confirm the relationship
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Enter your partner's secret code</Label>
                <Input
                  id="code"
                  placeholder="Enter code"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleEnterCode}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Confirm Relationship
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
