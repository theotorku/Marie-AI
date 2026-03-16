import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: number;
  type: "daily_briefing" | "follow_up_nudge" | "meeting_prep" | "restock_alert";
  title: string;
  content: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", { headers });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: Notification) => !n.read).length);
    } catch { /* no-op */ }
    setLoading(false);
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications/unread-count", { headers });
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch { /* no-op */ }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const markAsRead = useCallback(async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers,
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, [token]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      headers,
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [token]);

  const triggerBriefing = useCallback(async () => {
    const res = await fetch("/api/agent/briefing", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (data.notification) {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((c) => c + 1);
    }
    return data;
  }, [token]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    refresh: fetchNotifications,
    triggerBriefing,
  };
}
