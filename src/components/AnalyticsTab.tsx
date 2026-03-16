import { useState, useEffect } from "react";

interface AnalyticsTabProps {
  token: string | null;
  isPro: boolean;
  onUpgrade: () => void;
}

interface Analytics {
  messages: { total: number; today: number; week: number; byDay: { date: string; count: number }[] };
  tasks: { total: number; completed: number; pending: number; byPriority: { high: number; medium: number; low: number } };
  templates: number;
  notifications: { total: number; unread: number; byType: Record<string, number> };
  topTopics: { topic: string; count: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      padding: "18px 20px", borderRadius: 14,
      border: "1px solid rgba(196,151,59,0.1)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#C4973B", fontFamily: "'Playfair Display', serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "rgba(232,224,212,0.35)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "rgba(232,224,212,0.6)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "rgba(232,224,212,0.4)" }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: 6, borderRadius: 3, background: color, width: `${pct}%`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 4, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: "100%", maxWidth: 32, borderRadius: 4,
              background: d.count > 0 ? "linear-gradient(to top, rgba(139,105,20,0.6), rgba(196,151,59,0.8))" : "rgba(255,255,255,0.04)",
              height: `${Math.max(4, (d.count / max) * 64)}px`,
              transition: "height 0.5s ease",
            }}
          />
          <span style={{ fontSize: 9, color: "rgba(232,224,212,0.3)" }}>
            {new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsTab({ token, isPro, onUpgrade }: AnalyticsTabProps) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!isPro) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>{"\u{1F4CA}"}</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Analytics</h2>
        <p style={{ fontSize: 13, color: "rgba(232,224,212,0.45)", marginBottom: 24 }}>
          Track your productivity and usage patterns. Available on Professional plan.
        </p>
        <button onClick={onUpgrade} style={{
          padding: "10px 24px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #8B6914, #C4973B)",
          color: "#1A1611", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          Upgrade — $29/mo
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 0", textAlign: "center", color: "rgba(232,224,212,0.4)" }}>
        Loading analytics...
      </div>
    );
  }

  const completionRate = data.tasks.total > 0 ? Math.round((data.tasks.completed / data.tasks.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Analytics</h2>
      <p style={{ fontSize: 13, color: "rgba(232,224,212,0.4)", marginBottom: 24 }}>Your Marie AI usage at a glance.</p>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard label="Messages Today" value={data.messages.today} sub={`${data.messages.week} this week`} />
        <StatCard label="Total Messages" value={data.messages.total} />
        <StatCard label="Task Completion" value={`${completionRate}%`} sub={`${data.tasks.completed}/${data.tasks.total} tasks`} />
        <StatCard label="Templates" value={data.templates} />
      </div>

      {/* Activity chart */}
      <div style={{
        padding: 20, borderRadius: 14,
        border: "1px solid rgba(196,151,59,0.1)",
        background: "rgba(255,255,255,0.02)",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>
          Message Activity (Last 7 Days)
        </div>
        <ActivityChart data={data.messages.byDay} />
      </div>

      {/* Tasks breakdown + Agent activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{
          padding: 20, borderRadius: 14,
          border: "1px solid rgba(196,151,59,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>
            Tasks by Priority
          </div>
          <MiniBar label="High" value={data.tasks.byPriority.high} max={data.tasks.total} color="#E8735A" />
          <MiniBar label="Medium" value={data.tasks.byPriority.medium} max={data.tasks.total} color="#C4973B" />
          <MiniBar label="Low" value={data.tasks.byPriority.low} max={data.tasks.total} color="rgba(196,151,59,0.4)" />
        </div>

        <div style={{
          padding: 20, borderRadius: 14,
          border: "1px solid rgba(196,151,59,0.1)",
          background: "rgba(255,255,255,0.02)",
        }}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 14 }}>
            Agent Notifications
          </div>
          {Object.entries(data.notifications.byType).length > 0 ? (
            Object.entries(data.notifications.byType).map(([type, count]) => (
              <MiniBar
                key={type}
                label={type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                value={count as number}
                max={data.notifications.total}
                color="#C4973B"
              />
            ))
          ) : (
            <div style={{ fontSize: 12, color: "rgba(232,224,212,0.3)", padding: "10px 0" }}>No notifications yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
