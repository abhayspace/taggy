import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor, User } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditProfile: () => void;
}

export const SettingsDialog = ({ open, onOpenChange, onEditProfile }: SettingsDialogProps) => {
  const { theme, setTheme } = useTheme();

  const handleEditProfile = () => {
    onOpenChange(false);
    onEditProfile();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Edit Profile */}
          <div className="space-y-2">
            <Label>Profile</Label>
            <Button
              onClick={handleEditProfile}
              variant="outline"
              className="w-full justify-start"
            >
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>

          {/* Theme Settings */}
          <div className="space-y-3">
            <Label>Appearance</Label>
            <div className="space-y-2">
              <button
                onClick={() => setTheme("light")}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  theme === "light"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4" />
                  <span className="text-sm font-medium">Light</span>
                </div>
                {theme === "light" && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4" />
                  <span className="text-sm font-medium">Dark</span>
                </div>
                {theme === "dark" && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  theme === "system"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4" />
                  <span className="text-sm font-medium">System</span>
                </div>
                {theme === "system" && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
