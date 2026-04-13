import { useState } from "react";

interface CommandCenterProps {
  userName: string;
  notifications: Array<{ id: number; type: string; title: string; content: string; read: boolean; created_at: string }>;
  tasks: Array<{ id: number; text: string; priority: string; done: boolean }>;
  unreadEmails?: number;
  upcomingEvents?: number;
  contactsCount?: number;
  pipelineCounts?: { lead: number; pitched: number; negotiating: number; closed: number; lost: number };
  marieScore?: number;
  onNavigate: (tab: string) => void;
  onTriggerBriefing: () => Promise<void>;
  greeting: string;
  dateStr: string;
}

export function getTimeGradient(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    // Morning — warm amber
    return "linear-gradient(135deg, rgba(139,105,20,0.08) 0%, rgba(196,151,59,0.04) 50%, rgba(30,25,18,0) 100%)";
  } else if (hour >= 12 && hour < 18) {
    // Afternoon — neutral warm
    return "linear-gradient(135deg, rgba(196,151,59,0.04) 0%, rgba(30,25,18,0) 50%, rgba(232,224,212,0.02) 100%)";
  } else {
    // Evening/night — cool blue-tint
    return "linear-gradient(135deg, rgba(40,50,80,0.08) 0%, rgba(30,25,18,0) 50%, rgba(91,164,232,0.03) 100%)";
  }
}

const STAGE_COLORS: Record<string, string> = {
  lead: "rgba(232,224,212,0.5)",
  pitched: "#5BA4E8",
  negotiating: "#C4973B",
  closed: "#4CAF50",
  lost: "#E8735A",
};

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  pitched: "Pitched",
  negotiating: "Negotiating",
  closed: "Closed",
  lost: "Lost",
};

function ScoreArc({ score }: { score: number }) {
  const color = score > 70 ? "#4CAF50" : score >= 40 ? "#D4A84B" : "#E8735A";
  const radius = 36;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <svg width={90} height={90} viewBox="0 0 90 90" style={{ display: "block", margin: "0 auto" }}>
      <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx="45" cy="45" r={radius} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${progress} ${circumference - progress}`}
        strokeDashoffset={circumference * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="45" y="45" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 22, fontWeight: 700, fill: color, fontFamily: "'Playfair Display', serif" }}>
        {score}
      </text>
    </svg>
  );
}

export default function CommandCenter({
  userName, notifications, tasks, unreadEmails, upcomingEvents,
  contactsCount: _contactsCount, pipelineCounts, marieScore,
  onNavigate, onTriggerBriefing, greeting, dateStr,
}: CommandCenterProps) {
  const [briefingLoading, setBriefingLoading] = useState(false);

  const latestBriefing = notifications
    .filter((n) => n.type === "briefing")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const incompleteTasks = tasks.filter((t) => !t.done).length;

  const handleBriefing = async () => {
    setBriefingLoading(true);
    try { await onTriggerBriefing(); } finally { setBriefingLoading(false); }
  };

  const cardStyle = (delay: number): React.CSSProperties => ({
    padding: "22px 24px",
    borderRadius: 16,
    border: "1px solid rgba(196,151,59,0.1)",
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    cursor: "pointer",
    animation: `fadeUp 0.5s ease-out ${delay}s both`,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  });

  return (
    <div style={{ padding: "40px 0 60px", maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cc-card:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 32px rgba(196,151,59,0.08) !important;
        }
      `}</style>

      {/* Greeting */}
      <div style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 64,
          fontWeight: 600,
          color: "#E8E0D4",
          lineHeight: 1.1,
          margin: 0,
        }}>
          {greeting}
        </h1>
        <div style={{
          fontSize: 11,
          color: "rgba(232,224,212,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          marginTop: 10,
        }}>
          {dateStr}
        </div>
      </div>

      {/* Briefing narrative */}
      <div style={{ marginTop: 36, animation: "fadeUp 0.5s ease-out 0.15s both" }}>
        {latestBriefing ? (
          <div style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: "rgba(232,224,212,0.6)",
            fontFamily: "'DM Sans', sans-serif",
            borderLeft: "2px solid rgba(196,151,59,0.25)",
            paddingLeft: 20,
            maxHeight: 200,
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          }}>
            {latestBriefing.content}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{
              fontSize: 13, color: "rgba(232,224,212,0.35)",
              fontFamily: "'DM Sans', sans-serif", marginBottom: 16,
            }}>
              No briefing yet today. Let Marie prepare your morning overview.
            </p>
            <button
              onClick={handleBriefing}
              disabled={briefingLoading}
              style={{
                padding: "10px 28px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #8B6914, #C4973B)",
                color: "#1A1611", fontWeight: 700, fontSize: 13,
                cursor: briefingLoading ? "wait" : "pointer",
                opacity: briefingLoading ? 0.6 : 1,
                fontFamily: "'DM Sans', sans-serif",
                transition: "opacity 0.2s ease",
              }}
            >
              {briefingLoading ? "Generating..." : "Generate Your First Briefing"}
            </button>
          </div>
        )}
      </div>

      {/* Action cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: 16,
        marginTop: 36,
      }}>
        {/* Tasks */}
        <div className="cc-card" style={cardStyle(0.25)} onClick={() => onNavigate("tasks")}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
            Tasks
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#C4973B", fontFamily: "'Playfair Display', serif" }}>
            {incompleteTasks}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,212,0.3)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
            {incompleteTasks === 1 ? "open task" : "open tasks"}
          </div>
        </div>

        {/* Pipeline */}
        <div className="cc-card" style={cardStyle(0.35)} onClick={() => onNavigate("contacts")}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
            Pipeline
          </div>
          {pipelineCounts ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(Object.keys(STAGE_COLORS) as Array<keyof typeof STAGE_COLORS>).map((stage) => {
                const count = pipelineCounts[stage as keyof typeof pipelineCounts] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: STAGE_COLORS[stage], flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, color: "rgba(232,224,212,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                      {count} {STAGE_LABELS[stage]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(232,224,212,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
              No pipeline data
            </div>
          )}
        </div>

        {/* Emails */}
        <div className="cc-card" style={cardStyle(0.45)} onClick={() => onNavigate("emails")}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
            Emails
          </div>
          {unreadEmails !== undefined ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#C4973B", fontFamily: "'Playfair Display', serif" }}>
                {unreadEmails}
              </div>
              <div style={{ fontSize: 11, color: "rgba(232,224,212,0.3)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
                unread
              </div>
            </>
          ) : (
            <div style={{
              fontSize: 12, color: "rgba(196,151,59,0.5)",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
            }}>
              Connect Gmail
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="cc-card" style={cardStyle(0.55)} onClick={() => onNavigate("calendar")}>
          <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
            Calendar
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#C4973B", fontFamily: "'Playfair Display', serif" }}>
            {upcomingEvents ?? 0}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,224,212,0.3)", marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
            upcoming {(upcomingEvents ?? 0) === 1 ? "event" : "events"}
          </div>
        </div>

        {/* Marie Score */}
        {marieScore !== undefined && (
          <div className="cc-card" style={cardStyle(0.65)}>
            <div style={{ fontSize: 10, color: "rgba(232,224,212,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}>
              Marie Score
            </div>
            <ScoreArc score={marieScore} />
          </div>
        )}
      </div>
    </div>
  );
}
