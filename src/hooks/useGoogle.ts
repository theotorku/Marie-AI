import { useState, useEffect, useCallback } from "react";

export function useGoogle(token: string | null) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/google/status", { headers })
      .then((res) => res.json())
      .then((data) => setConnected(data.connected))
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, [token]);

  // Re-check connection when window regains focus (after OAuth popup closes)
  useEffect(() => {
    if (!token || connected) return;
    const onFocus = () => {
      fetch("/api/google/status", { headers })
        .then((res) => res.json())
        .then((data) => { if (data.connected) setConnected(true); })
        .catch(() => {});
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token, connected]);

  const connect = useCallback(async () => {
    const res = await fetch("/api/google/auth-url", { headers });
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank", "width=500,height=700");
    }
  }, [token]);

  const disconnect = useCallback(async () => {
    await fetch("/api/google/disconnect", { method: "POST", headers });
    setConnected(false);
  }, [token]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/google/status", { headers });
    const data = await res.json();
    setConnected(data.connected);
  }, [token]);

  return { connected, loading, connect, disconnect, refresh };
}
