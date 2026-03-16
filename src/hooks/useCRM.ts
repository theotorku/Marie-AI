import { useState, useEffect, useCallback } from "react";

export interface Contact {
  id: number;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  stage: "lead" | "pitched" | "negotiating" | "closed" | "lost";
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: number;
  contact_id: number;
  type: "email" | "meeting" | "call" | "note";
  summary: string;
  created_at: string;
}

export function useCRM(token: string | null) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/contacts", { headers });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch { /* no-op */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchContacts(); }, [token]);

  const addContact = useCallback(async (contact: Partial<Contact>) => {
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    });
    const data = await res.json();
    if (data.contact) setContacts((prev) => [data.contact, ...prev]);
    return data;
  }, [token]);

  const updateContact = useCallback(async (id: number, updates: Partial<Contact>) => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.contact) setContacts((prev) => prev.map((c) => (c.id === id ? data.contact : c)));
    return data;
  }, [token]);

  const deleteContact = useCallback(async (id: number) => {
    await fetch(`/api/contacts/${id}`, { method: "DELETE", headers });
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, [token]);

  const getInteractions = useCallback(async (contactId: number): Promise<Interaction[]> => {
    const res = await fetch(`/api/contacts/${contactId}/interactions`, { headers });
    const data = await res.json();
    return data.interactions || [];
  }, [token]);

  const addInteraction = useCallback(async (contactId: number, type: string, summary: string) => {
    const res = await fetch(`/api/contacts/${contactId}/interactions`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ type, summary }),
    });
    const data = await res.json();
    // Update last_contacted_at locally
    setContacts((prev) => prev.map((c) =>
      c.id === contactId ? { ...c, last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() } : c
    ));
    return data;
  }, [token]);

  return { contacts, loading, addContact, updateContact, deleteContact, getInteractions, addInteraction, refresh: fetchContacts };
}
