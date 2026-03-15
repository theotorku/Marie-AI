import { useState, useEffect } from "react";

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

interface EmailDetail {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
}

interface EmailsTabProps {
  token: string | null;
  connected: boolean;
  onConnect: () => void;
  needsUpgrade?: boolean;
}

export default function EmailsTab({ token, connected, onConnect, needsUpgrade }: EmailsTabProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    fetch("/api/gmail/messages", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEmails(data.messages || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [connected]);

  const openEmail = async (id: string) => {
    try {
      const res = await fetch(`/api/gmail/messages/${id}`, { headers });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelected(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email.");
    }
  };

  if (!connected) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Inbox</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u2709"}</div>
          <div style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#E8E0D4", marginBottom: 10 }}>
            {needsUpgrade ? "Gmail Integration" : "Connect Gmail"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(232,224,212,0.4)", maxWidth: 360, lineHeight: 1.7, marginBottom: 4 }}>
            {needsUpgrade
              ? "Read emails, get AI summaries, and draft replies — all from within Marie AI."
              : "Link your Google account to view your inbox, read emails, and draft AI-powered replies."}
          </div>
          {needsUpgrade && (
            <div style={{ fontSize: 12, color: "#C4973B", marginBottom: 20 }}>
              Included with Professional — $29/mo
            </div>
          )}
          <button
            onClick={onConnect}
            style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 14, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {needsUpgrade ? "Upgrade to Professional" : "Connect Google Account"}
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "none", border: "none", color: "#C4973B",
            fontSize: 13, cursor: "pointer", marginBottom: 20,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {"<"} Back to Inbox
        </button>
        <div style={{
          padding: 24, borderRadius: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(196,151,59,0.1)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#E8E0D4", marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
            {selected.subject}
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,224,212,0.5)", marginBottom: 4 }}>
            From: {selected.from}
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,224,212,0.35)", marginBottom: 20 }}>
            {new Date(selected.date).toLocaleString()}
          </div>
          <div style={{
            fontSize: 14, color: "#E8E0D4", lineHeight: 1.7,
            whiteSpace: "pre-wrap", borderTop: "1px solid rgba(196,151,59,0.08)",
            paddingTop: 16,
          }}>
            {selected.body}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Inbox</h2>

      {error && (
        <div style={{ fontSize: 13, color: "#E8735A", marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: "rgba(232,224,212,0.4)", fontSize: 13 }}>Loading emails...</div>
      ) : emails.length === 0 ? (
        <div style={{ color: "rgba(232,224,212,0.4)", fontSize: 13 }}>No emails found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {emails.map((email) => (
            <button
              key={email.id}
              onClick={() => openEmail(email.id)}
              style={{
                display: "flex", flexDirection: "column", gap: 4,
                padding: "14px 18px", borderRadius: 12, textAlign: "left",
                background: email.unread ? "rgba(196,151,59,0.06)" : "rgba(255,255,255,0.02)",
                border: email.unread ? "1px solid rgba(196,151,59,0.2)" : "1px solid rgba(196,151,59,0.08)",
                cursor: "pointer", transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  fontSize: 13, color: "#E8E0D4",
                  fontWeight: email.unread ? 700 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%",
                }}>
                  {email.from.replace(/<.*>/, "").trim()}
                </span>
                <span style={{ fontSize: 11, color: "rgba(232,224,212,0.3)", flexShrink: 0 }}>
                  {new Date(email.date).toLocaleDateString()}
                </span>
              </div>
              <div style={{
                fontSize: 14, color: email.unread ? "#E8E0D4" : "rgba(232,224,212,0.7)",
                fontWeight: email.unread ? 600 : 400,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {email.subject || "(No subject)"}
              </div>
              <div style={{
                fontSize: 12, color: "rgba(232,224,212,0.35)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {email.snippet}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
