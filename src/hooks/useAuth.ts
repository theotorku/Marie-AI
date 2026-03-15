import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("marie_token"),
    loading: true,
  });

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem("marie_token");
    if (!token) {
      setState({ user: null, token: null, loading: false });
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setState({ user: data.user, token, loading: false }))
      .catch(() => {
        localStorage.removeItem("marie_token");
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error;

    localStorage.setItem("marie_token", data.token);
    setState({ user: data.user, token: data.token, loading: false });
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) return data.error;

    localStorage.setItem("marie_token", data.token);
    setState({ user: data.user, token: data.token, loading: false });
    return null;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("marie_token");
    setState({ user: null, token: null, loading: false });
  }, []);

  return { ...state, login, register, logout };
}
