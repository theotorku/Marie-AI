import type { Notification } from "../hooks/useNotifications";

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onTriggerBriefing: () => void;
  isPro: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; accent: string }> = {
  daily_briefing: { icon: "\u2600", label: "Daily Briefing", accent: "#D4A84B" },
  follow_up_nudge: { icon: "\u{1F4E9}", label: "Follow-Up", accent: "#E8A0BF" },
  meeting_prep: { icon: "\u{1F4CB}", label: "Meeting Prep", accent: "#5BA4E8" },
  restock_alert: { icon: "\u{1F4E6}", label: "Product Alert", accent: "#A0C4A8" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onTriggerBriefing,
  isPro,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        maxWidth: "100vw",
        background: "rgba(13,11,9,0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(196,151,59,0.12)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0.8; } to { transform: translateX(0); opacity: 1; } }
        @keyframes notifFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .notif-card:hover { background: rgba(196,151,59,0.06) !important; }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid rgba(196,151,59,0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 20, fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
              Insights
            </div>
            {unreadCount > 0 && (
              <span style={{
                background: "linear-gradient(135deg, #8B6914, #C4973B)",
                color: "#1A1611",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
              }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,212,0.35)", marginTop: 4 }}>
            Marie is watching your back
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: "none",
                border: "1px solid rgba(196,151,59,0.15)",
                color: "rgba(232,224,212,0.45)",
                fontSize: 10,
                padding: "5px 12px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(196,151,59,0.1)",
              color: "rgba(232,224,212,0.4)",
              fontSize: 16,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 8,
              transition: "all 0.15s",
            }}
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      {/* Generate briefing */}
      {isPro && (
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(196,151,59,0.06)" }}>
          <button
            onClick={onTriggerBriefing}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(196,151,59,0.2)",
              background: "rgba(196,151,59,0.06)",
              backdropFilter: "blur(8px)",
              color: "#C4973B",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>{"\u2726"}</span>
            Generate Fresh Briefing
          </button>
        </div>
      )}

      {/* Notification list */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: "60px 32px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>{"\u2726"}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#E8E0D4" }}>
              {isPro ? "Your insights will appear here" : "Unlock proactive intelligence"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(232,224,212,0.35)", lineHeight: 1.6 }}>
              {isPro
                ? "Marie will surface briefings, follow-up nudges, meeting prep, and product alerts as they become relevant."
                : "Upgrade to Professional for daily briefings, follow-up reminders, and smart alerts that keep you ahead."}
            </div>
          </div>
        ) : (
          notifications.map((n, idx) => {
            const cfg = TYPE_CONFIG[n.type] || { icon: "\u{1F514}", label: n.type, accent: "#C4973B" };
            return (
              <div
                key={n.id}
                className="notif-card"
                onClick={() => !n.read && onMarkRead(n.id)}
                style={{
                  padding: "16px 24px",
                  margin: "4px 12px",
                  borderRadius: 14,
                  cursor: n.read ? "default" : "pointer",
                  background: n.read ? "transparent" : "rgba(196,151,59,0.03)",
                  borderLeft: `3px solid ${n.read ? "transparent" : cfg.accent}`,
                  transition: "all 0.2s",
                  animation: `notifFadeIn 0.3s ease-out ${idx * 0.05}s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: cfg.accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontWeight: 700,
                      }}
                    >
                      {cfg.label}
                    </span>
                    {!n.read && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: cfg.accent,
                          display: "inline-block",
                          boxShadow: `0 0 6px ${cfg.accent}60`,
                        }}
                      />
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(232,224,212,0.25)" }}>
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#E8E0D4",
                    marginBottom: 8,
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {n.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(232,224,212,0.55)",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
