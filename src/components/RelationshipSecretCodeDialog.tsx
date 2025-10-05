import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const generateSecureCode = () => {
    // Generate 12-character alphanumeric code (uppercase letters and numbers)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking chars
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    if (!relationship) return;
    
    setLoading(true);
    try {
      const code = generateSecureCode();
      
      const { error } = await supabase
        .from('relationships')
        .update({ 
          secret_code: code,
          secret_code_created_at: new Date().toISOString(),
          secret_code_attempts: 0
        })
        .eq('id', relationship.id);

      if (error) throw error;

      setSecretCode(code);
      toast({
        title: "Secret code generated",
        description: "Code expires in 48 hours. Share with your partner to confirm.",
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

      // Check if code has expired (48 hours)
      const codeCreatedAt = relationshipData.secret_code_created_at;
      if (codeCreatedAt) {
        const createdDate = new Date(codeCreatedAt);
        const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreated > 48) {
          toast({
            title: "Code expired",
            description: "This secret code has expired. Please ask your partner to generate a new one.",
            variant: "destructive",
          });
          return;
        }
      }

      // Check rate limiting (max 5 attempts)
      if (relationshipData.secret_code_attempts >= 5) {
        toast({
          title: "Too many attempts",
          description: "This code has been locked due to too many failed attempts.",
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
          secret_code: null,
          secret_code_created_at: null,
          secret_code_attempts: 0
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
      // Increment attempt counter on error
      if (enteredCode.trim()) {
        const { data: relationshipData } = await supabase
          .from('relationships')
          .select('secret_code_attempts')
          .eq('secret_code', enteredCode.toUpperCase())
          .eq('partner_id', currentUserId)
          .maybeSingle();
        
        if (relationshipData) {
          await supabase
            .from('relationships')
            .update({ 
              secret_code_attempts: (relationshipData.secret_code_attempts || 0) + 1 
            })
            .eq('secret_code', enteredCode.toUpperCase())
            .eq('partner_id', currentUserId);
        }
      }

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
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Codes are 12 characters, expire in 48 hours, and have a 5-attempt limit for security.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Generate a secret code for your partner</Label>
                {secretCode ? (
                  <div className="flex items-center gap-2">
                    <Input value={secretCode} readOnly className="font-mono text-base" />
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
                  Share this code with your partner within 48 hours to confirm the relationship
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
