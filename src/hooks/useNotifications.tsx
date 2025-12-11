import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  event_id: string;
  notification_type: "payment_pending" | "new_comment" | "new_message" | "item_released";
  reference_id: string;
  priority: number;
  is_read: boolean;
  metadata: {
    event_name?: string;
    sender_name?: string;
    sender_email?: string;
    commenter_name?: string;
    contributor_name?: string;
    subject?: string;
    preview?: string;
    guest_name?: string;
    rsvp_status?: string;
  };
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [newCommentsCount, setNewCommentsCount] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications((data as Notification[]) || []);

      // Calculate KPIs
      const unread = data || [];
      setPendingPaymentsCount(
        unread.filter((n) => n.notification_type === "payment_pending" && !n.is_read).length
      );
      setUnreadMessagesCount(
        unread.filter((n) => n.notification_type === "new_message" && !n.is_read).length
      );
      setNewCommentsCount(
        unread.filter((n) => n.notification_type === "new_comment" && !n.is_read).length
      );
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: false })
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
      );
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    loading,
    pendingPaymentsCount,
    unreadMessagesCount,
    newCommentsCount,
    markAsRead,
    markAsUnread,
    refresh: loadNotifications,
  };
}
