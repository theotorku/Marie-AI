import { useState, useEffect, useCallback } from "react";

export function useN8n(token: string | null) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/n8n/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const connect = useCallback(async (webhookUrl: string) => {
    if (!token) return;
    const res = await fetch("/api/n8n/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ webhookUrl }),
    });
    if (res.ok) {
      setConnected(true);
      return null;
    }
    const data = await res.json();
    return data.error || "Failed to connect";
  }, [token]);

  const disconnect = useCallback(async () => {
    if (!token) return;
    await fetch("/api/n8n/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConnected(false);
  }, [token]);

  return { connected, loading, connect, disconnect, refresh: checkStatus };
}
