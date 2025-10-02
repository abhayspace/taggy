import { Home, Compass, MessageCircle, User, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/feed", icon: Home, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/notifications", icon: Bell, label: "Notifications" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-rainbow backdrop-blur-xl border-t-4 border-primary/30 z-50 shadow-glow-rainbow">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all ${
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              }`}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? "fill-primary" : ""}`}
              />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
