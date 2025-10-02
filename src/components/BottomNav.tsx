import { Home, Compass, MessageCircle, User, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to message changes
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', user.id);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const navItems = [
    { path: "/feed", icon: Home, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/notifications", icon: Bell, label: "Notifications" },
    { path: "/chat", icon: MessageCircle, label: "Chat", badge: unreadCount },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all relative ${
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 ${isActive ? "fill-primary" : ""}`}
                />
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </div>
                )}
              </div>
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
