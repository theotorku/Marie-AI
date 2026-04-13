import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  location: string;
  htmlLink: string;
}

interface CalendarTabProps {
  token: string | null;
  connected: boolean;
  onConnect: () => void;
  needsUpgrade?: boolean;
}

function formatTime(dateStr: string): string {
  if (!dateStr.includes("T")) return dateStr; // all-day event
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = formatDate(event.start);
    const list = groups.get(key) || [];
    list.push(event);
    groups.set(key, list);
  }
  return groups;
}

export default function CalendarTab({ token, connected, onConnect, needsUpgrade }: CalendarTabProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    fetch("/api/calendar/events", { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEvents(data.events || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [connected]);

  if (!connected) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Upcoming Events</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u25C9"}</div>
          <div style={{ fontSize: 18, fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#E8E0D4", marginBottom: 10 }}>
            {needsUpgrade ? "Calendar Integration" : "Connect Calendar"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(232,224,212,0.7)", maxWidth: 360, lineHeight: 1.7, marginBottom: 4 }}>
            {needsUpgrade
              ? "View upcoming events, get AI meeting prep briefs, and surface action items."
              : "Link your Google account to view upcoming events, get meeting prep briefs, and surface action items."}
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

  const grouped = groupByDate(events);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Upcoming Events</h2>

      {error && (
        <div style={{ fontSize: 13, color: "#E8735A", marginBottom: 16 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: "rgba(232,224,212,0.7)", fontSize: 13 }}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={{ color: "rgba(232,224,212,0.7)", fontSize: 13 }}>No upcoming events.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Array.from(grouped.entries()).map(([date, dayEvents]) => (
            <div key={date}>
              <div style={{
                fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
                color: "#C4973B", fontWeight: 700, marginBottom: 10,
              }}>
                {date}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dayEvents.map((event) => (
                  <a
                    key={event.id}
                    href={event.htmlLink || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "14px 18px", borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(196,151,59,0.1)",
                      display: "flex", gap: 16, alignItems: "flex-start",
                      textDecoration: "none", color: "inherit",
                      cursor: event.htmlLink ? "pointer" : "default",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(196,151,59,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(196,151,59,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  >
                    <div style={{
                      fontSize: 13, color: "#C4973B", fontWeight: 600,
                      minWidth: 56, flexShrink: 0, paddingTop: 2,
                    }}>
                      {formatTime(event.start)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D4", marginBottom: 2 }}>
                          {event.summary}
                        </div>
                        {event.htmlLink && (
                          <span style={{ fontSize: 10, color: "rgba(232,224,212,0.5)", flexShrink: 0 }}>
                            Open in Calendar {"\u2197"}
                          </span>
                        )}
                      </div>
                      {event.location && (
                        <div style={{ fontSize: 12, color: "rgba(232,224,212,0.7)" }}>
                          {event.location}
                        </div>
                      )}
                      {event.description && (
                        <div style={{
                          fontSize: 12, color: "rgba(232,224,212,0.65)",
                          marginTop: 4, lineHeight: 1.5,
                          overflow: "hidden", textOverflow: "ellipsis",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
