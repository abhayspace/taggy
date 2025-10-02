import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.png";
import { Call } from "@/hooks/useAgoraCalls";

interface IncomingCallPopupProps {
  call: Call;
  callerInfo: {
    display_name: string | null;
    username: string;
    profile_picture_url: string | null;
  } | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallPopup = ({
  call,
  callerInfo,
  onAccept,
  onReject,
}: IncomingCallPopupProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-card via-background to-card p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 border-2 border-primary/20 animate-scale-in">
        <div className="flex flex-col items-center gap-6">
          {/* Caller Avatar with Pulse */}
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-primary shadow-xl">
              <AvatarImage
                src={callerInfo?.profile_picture_url || defaultAvatar}
              />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl">
                {(callerInfo?.display_name || callerInfo?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-4 border-primary/50 animate-pulse"></div>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">
              {callerInfo?.display_name || callerInfo?.username}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              {call.call_type === 'video' ? (
                <>
                  <Video className="w-5 h-5" />
                  Incoming Video Call
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Incoming Voice Call
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-6 mt-4">
            <Button
              onClick={onReject}
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16 shadow-lg hover:scale-110 transition-transform"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            <Button
              onClick={onAccept}
              size="lg"
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 shadow-lg hover:scale-110 transition-transform"
            >
              <Phone className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
