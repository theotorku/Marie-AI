import type { Notification } from "../hooks/useNotifications";

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onTriggerBriefing: () => void;
  isPro: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  daily_briefing: "\u2600",
  follow_up_nudge: "\u{1F4E9}",
  meeting_prep: "\u{1F4CB}",
  restock_alert: "\u{1F4E6}",
};

const TYPE_LABELS: Record<string, string> = {
  daily_briefing: "Daily Briefing",
  follow_up_nudge: "Follow-Up",
  meeting_prep: "Meeting Prep",
  restock_alert: "Product Alert",
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
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        maxWidth: "100vw",
        background: "rgba(13,11,9,0.98)",
        borderLeft: "1px solid rgba(196,151,59,0.15)",
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(196,151,59,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>
            Notifications
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,212,0.4)", marginTop: 2 }}>
            Marie AI Proactive Agent
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: "none",
                border: "1px solid rgba(196,151,59,0.2)",
                color: "rgba(232,224,212,0.5)",
                fontSize: 10,
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(232,224,212,0.5)",
              fontSize: 20,
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      {/* Generate briefing button */}
      {isPro && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(196,151,59,0.08)" }}>
          <button
            onClick={onTriggerBriefing}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.25)",
              background: "rgba(196,151,59,0.08)",
              color: "#C4973B",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Generate Daily Briefing Now
          </button>
        </div>
      )}

      {/* Notification list */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "rgba(232,224,212,0.3)",
              fontSize: 13,
            }}
          >
            {isPro
              ? "No notifications yet. Your proactive agent will generate briefings, follow-up nudges, and meeting prep automatically."
              : "Upgrade to Professional to unlock the proactive agent."}
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              style={{
                padding: "14px 24px",
                borderBottom: "1px solid rgba(196,151,59,0.05)",
                cursor: n.read ? "default" : "pointer",
                background: n.read ? "transparent" : "rgba(196,151,59,0.04)",
                transition: "background 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{TYPE_ICONS[n.type] || "\u{1F514}"}</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#C4973B",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  {!n.read && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#C4973B",
                        display: "inline-block",
                      }}
                    />
                  )}
                </div>
                <span style={{ fontSize: 10, color: "rgba(232,224,212,0.3)" }}>
                  {timeAgo(n.created_at)}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#E8E0D4",
                  marginBottom: 6,
                }}
              >
                {n.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(232,224,212,0.6)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {n.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
