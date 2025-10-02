import { Home, Compass, MessageCircle, User, Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    loadNotificationCount();

    // Subscribe to message changes
    const messagesChannel = supabase
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

    // Subscribe to friend request changes
    const requestsChannel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        () => {
          loadNotificationCount();
        }
      )
      .subscribe();

    // Subscribe to relationship changes (proposals / responses)
    const relationshipsChannel = supabase
      .channel('relationships-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'relationships'
        },
        () => {
          loadNotificationCount();
        }
      )
      .subscribe();

    // Listen for notifications viewed events from Notifications page
    const onNotificationsViewed = () => {
      loadNotificationCount();
    };
    window.addEventListener('notifications:viewed', onNotificationsViewed);

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(relationshipsChannel);
      window.removeEventListener('notifications:viewed', onNotificationsViewed);
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

  const loadNotificationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let lastViewedAt = localStorage.getItem('notifications_last_viewed_at');
      if (!lastViewedAt) {
        lastViewedAt = new Date().toISOString();
        localStorage.setItem('notifications_last_viewed_at', lastViewedAt);
        setNotificationsCount(0);
        return;
      }

      // New friend requests received since last viewed
      const { count: newRequests } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .gt('created_at', lastViewedAt);

      // Responses to requests I sent since last viewed (accepted/rejected)
      const { count: requestResponses } = await supabase
        .from('friend_requests')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .in('status', ['accepted', 'rejected'])
        .gt('updated_at', lastViewedAt);

      // Relationship events (proposals/accepts) since last viewed
      const { count: relationshipEvents } = await supabase
        .from('relationships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .gt('updated_at', lastViewedAt);

      const total = (newRequests || 0) + (requestResponses || 0) + (relationshipEvents || 0);
      setNotificationsCount(total);
    } catch (error) {
      console.error('Error loading notifications count:', error);
    }
  };

  const navItems = [
    { path: "/feed", icon: Home, label: "Home" },
    { path: "/discover", icon: Compass, label: "Discover" },
    { path: "/notifications", icon: Bell, label: "Notifications", badge: notificationsCount },
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
                {item.badge !== undefined && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
                    <span className="text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
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
