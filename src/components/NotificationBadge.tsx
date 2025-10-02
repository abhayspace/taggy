import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationBadgeProps {
  type: "notifications" | "chat";
  className?: string;
}

export const NotificationBadge = ({ type, className = "" }: NotificationBadgeProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadCount();

    // Set up real-time subscriptions
    const channel = supabase
      .channel(`${type}-badge`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: type === 'notifications' ? 'friend_requests' : 'messages'
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    // Also subscribe to relationship proposals for notifications
    let proposalChannel;
    if (type === 'notifications') {
      proposalChannel = supabase
        .channel('proposals-badge')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'relationships'
          },
          () => {
            loadCount();
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (proposalChannel) {
        supabase.removeChannel(proposalChannel);
      }
    };
  }, [type]);

  const loadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (type === 'notifications') {
        // Count friend requests
        const { count: friendRequestCount } = await supabase
          .from('friend_requests')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        // Count relationship proposals
        const { count: proposalCount } = await supabase
          .from('relationships')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', user.id)
          .eq('status', 'pending');

        setCount((friendRequestCount || 0) + (proposalCount || 0));
      } else {
        // Count unread messages across all conversations
        const { data: conversations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (!conversations) {
          setCount(0);
          return;
        }

        let totalUnread = 0;
        for (const conv of conversations) {
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .eq('read', false)
            .neq('sender_id', user.id);

          totalUnread += unreadCount || 0;
        }

        setCount(totalUnread);
      }
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  if (count === 0) return null;

  return (
    <div
      className={`absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-scale-in border-2 border-background ${className}`}
    >
      {count > 9 ? '9+' : count}
    </div>
  );
};
