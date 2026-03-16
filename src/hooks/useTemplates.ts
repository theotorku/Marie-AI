import { useState, useEffect, useCallback } from "react";

export interface EmailTemplate {
  id: number;
  name: string;
  category: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function useTemplates(token: string | null) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetch_ = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/templates", { headers });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch { /* no-op */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetch_(); }, [token]);

  const save = useCallback(async (template: { name: string; category?: string; subject?: string; body: string }) => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(template),
    });
    const data = await res.json();
    if (data.template) {
      setTemplates((prev) => [data.template, ...prev]);
    }
    return data;
  }, [token]);

  const update = useCallback(async (id: number, updates: Partial<EmailTemplate>) => {
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.template) {
      setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)));
    }
    return data;
  }, [token]);

  const remove = useCallback(async (id: number) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE", headers });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, [token]);

  return { templates, loading, save, update, remove, refresh: fetch_ };
}
