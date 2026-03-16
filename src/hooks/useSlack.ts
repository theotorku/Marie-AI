import { useState, useEffect, useCallback } from "react";

interface SlackState {
  connected: boolean;
  teamName: string | null;
  loading: boolean;
}

export function useSlack(token: string | null) {
  const [state, setState] = useState<SlackState>({
    connected: false,
    teamName: null,
    loading: true,
  });

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) return;
    fetch("/api/slack/status", { headers })
      .then((res) => res.json())
      .then((data) => setState({ connected: data.connected, teamName: data.teamName, loading: false }))
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, [token]);

  const connect = useCallback(async () => {
    try {
      const res = await fetch("/api/slack/auth-url", { headers });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700");
      } else if (data.error && data.upgrade) {
        alert("Slack integration requires a Professional plan.");
      } else {
        alert(data.error || "Failed to get Slack auth URL.");
      }
    } catch {
      alert("Unable to connect to Slack. Please try again.");
    }
  }, [token]);

  const disconnect = useCallback(async () => {
    await fetch("/api/slack/disconnect", { method: "POST", headers });
    setState({ connected: false, teamName: null, loading: false });
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/slack/status", { headers });
    const data = await res.json();
    setState({ connected: data.connected, teamName: data.teamName, loading: false });
  }, [token]);

  return { ...state, connect, disconnect, refresh };
}
