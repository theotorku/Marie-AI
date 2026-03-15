import { useState } from "react";

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (email: string, password: string, name: string) => Promise<string | null>;
}

export default function AuthScreen({ onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const err =
      mode === "login"
        ? await onLogin(email, password)
        : await onRegister(email, password, name);

    if (err) setError(err);
    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 12,
    border: "1px solid rgba(196,151,59,0.25)",
    background: "rgba(255,255,255,0.04)",
    color: "#E8E0D4",
    fontSize: 14,
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #1A1611 0%, #0D0B09 40%, #14110E 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: rgba(232,224,212,0.3); }
      `}</style>

      <div style={{ width: 400, padding: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#1A1611",
              fontFamily: "'Playfair Display', serif",
              marginBottom: 16,
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: 24,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 600,
              color: "#E8E0D4",
              marginBottom: 6,
            }}
          >
            Marie AI
          </div>
          <div style={{ fontSize: 13, color: "rgba(232,224,212,0.4)" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={inputStyle}
          />

          {error && (
            <div style={{ fontSize: 13, color: "#E8735A", textAlign: "center" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: submitting
                ? "rgba(196,151,59,0.3)"
                : "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
              marginTop: 4,
            }}
          >
            {submitting ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#C4973B",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
