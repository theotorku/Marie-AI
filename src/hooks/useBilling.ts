import { useState, useEffect, useCallback } from "react";

interface Usage {
  used: number;
  limit: number;
  remaining: number;
}

interface BillingState {
  tier: string;
  usage: Usage | null;
  loading: boolean;
  gmail: boolean;
  calendar: boolean;
}

export function useBilling(token: string | null) {
  const [state, setState] = useState<BillingState>({
    tier: "free",
    usage: null,
    loading: true,
    gmail: false,
    calendar: false,
  });

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!token) return;
    fetch("/api/billing/tier", { headers })
      .then((res) => res.json())
      .then((data) => {
        setState({
          tier: data.tier || "free",
          usage: data.usage || null,
          loading: false,
          gmail: data.gmail || false,
          calendar: data.calendar || false,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, [token]);

  const upgrade = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout. Please try again.");
      }
    } catch {
      alert("Unable to connect to billing. Please try again.");
    }
  }, [token]);

  const manage = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal. Please try again.");
      }
    } catch {
      alert("Unable to connect to billing. Please try again.");
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/billing/tier", { headers });
    const data = await res.json();
    setState({
      tier: data.tier || "free",
      usage: data.usage || null,
      loading: false,
      gmail: data.gmail || false,
      calendar: data.calendar || false,
    });
  }, [token]);

  return { ...state, upgrade, manage, refresh };
}
