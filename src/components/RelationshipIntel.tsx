import React, { useState } from "react";

// --- Health Score Computation ---

interface HealthContact {
  stage: string;
  last_contacted_at: string | null;
  created_at: string;
}

interface HealthInteraction {
  type: string;
  created_at: string;
}

interface HealthResult {
  score: number;
  label: string;
  color: string;
  momentum: "up" | "down" | "stable";
}

const STAGE_POINTS: Record<string, number> = {
  lead: 20,
  pitched: 40,
  negotiating: 60,
  closed: 80,
  lost: 10,
};

export function computeHealthScore(
  contact: HealthContact,
  interactions: HealthInteraction[]
): HealthResult {
  const now = Date.now();

  // Base: stage points
  let score = STAGE_POINTS[contact.stage] ?? 20;

  // Recency bonus
  if (contact.last_contacted_at) {
    const daysSince = Math.floor(
      (now - new Date(contact.last_contacted_at).getTime()) / 86400000
    );
    if (daysSince <= 3) score += 20;
    else if (daysSince <= 7) score += 10;
    else if (daysSince <= 14) score += 0;
    else score -= 20;
  } else {
    score -= 20;
  }

  // Interaction frequency in last 30 days
  const thirtyDaysAgo = now - 30 * 86400000;
  const recentCount = interactions.filter(
    (i) => new Date(i.created_at).getTime() > thirtyDaysAgo
  ).length;
  if (recentCount > 3) score += 10;
  else if (recentCount >= 1) score += 0;
  else score -= 10;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Momentum: compare last 14 days vs previous 14 days
  const fourteenDaysAgo = now - 14 * 86400000;
  const twentyEightDaysAgo = now - 28 * 86400000;
  const recentWindow = interactions.filter(
    (i) => new Date(i.created_at).getTime() > fourteenDaysAgo
  ).length;
  const previousWindow = interactions.filter((i) => {
    const t = new Date(i.created_at).getTime();
    return t > twentyEightDaysAgo && t <= fourteenDaysAgo;
  }).length;

  let momentum: "up" | "down" | "stable" = "stable";
  if (recentWindow > previousWindow) momentum = "up";
  else if (recentWindow < previousWindow) momentum = "down";

  // Label & color
  let label: string;
  let color: string;
  if (score > 70) {
    label = "Thriving";
    color = "#4CAF50";
  } else if (score > 55) {
    label = "Warm";
    color = "#C4973B";
  } else if (score > 40) {
    label = "Cooling";
    color = "#C4973B";
  } else if (score > 20) {
    label = "Cold";
    color = "#E8735A";
  } else {
    label = "At Risk";
    color = "#E8735A";
  }

  return { score, label, color, momentum };
}

// --- Health Badge ---

export function HealthBadge({
  contact,
  interactions,
}: {
  contact: HealthContact;
  interactions: HealthInteraction[];
}) {
  const [hovered, setHovered] = useState(false);
  const { score, label, color, momentum } = computeHealthScore(
    contact,
    interactions
  );

  const arrow = momentum === "up" ? "\u2191" : momentum === "down" ? "\u2193" : "\u2192";

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        color,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {score}
      <span style={{ fontSize: 8, opacity: 0.8 }}>{arrow}</span>
      {hovered && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "5px 10px",
            borderRadius: 6,
            background: "rgba(26,22,17,0.95)",
            border: "1px solid rgba(196,151,59,0.2)",
            color: "#E8E0D4",
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: "nowrap",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {label} {momentum === "up" ? "- Trending up" : momentum === "down" ? "- Trending down" : "- Stable"}
        </span>
      )}
    </span>
  );
}

// --- Re-Engagement Prompt ---

export function ReEngagementPrompt({
  contact,
  onAction,
}: {
  contact: {
    name: string;
    company?: string;
    stage: string;
    last_contacted_at: string | null;
  };
  onAction: (action: string) => void;
}): React.JSX.Element | null {
  const now = Date.now();
  const lastContacted = contact.last_contacted_at
    ? new Date(contact.last_contacted_at).getTime()
    : null;

  if (lastContacted !== null && now - lastContacted < 14 * 86400000) {
    return null;
  }

  const daysSince = lastContacted
    ? Math.floor((now - lastContacted) / 86400000)
    : null;

  const message = daysSince
    ? `You haven't reached out to ${contact.name} in ${daysSince} days. Last time a gap this long happened with a ${contact.stage} contact, it cooled off. Quick action?`
    : `You've never reached out to ${contact.name}. ${contact.stage === "lead" ? "New leads go cold fast" : "This contact needs attention"}. Quick action?`;

  const actions: Array<{ label: string; key: string; icon: string }> = [
    { label: "Draft Email", key: "email", icon: "\u2709" },
    { label: "Schedule Call", key: "call", icon: "\uD83D\uDCDE" },
    { label: "Set Meeting", key: "meeting", icon: "\uD83D\uDCC5" },
  ];

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        borderLeft: "3px solid #C4973B",
        background: "rgba(196,151,59,0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(196,151,59,0.12)",
        borderLeftWidth: 3,
        borderLeftColor: "#C4973B",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "start",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
          {"\u26A0\uFE0F"}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.6,
            color: "rgba(232,224,212,0.7)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {message}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginLeft: 26 }}>
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={() => onAction(a.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(196,151,59,0.25)",
              background: "rgba(196,151,59,0.08)",
              color: "#C4973B",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(196,151,59,0.18)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(196,151,59,0.08)")
            }
          >
            <span style={{ fontSize: 12 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Interaction Timeline ---

const TYPE_COLORS: Record<string, string> = {
  email: "#E8735A",
  meeting: "#5BA4E8",
  call: "#4CAF50",
  note: "rgba(232,224,212,0.35)",
};

interface TimelineInteraction {
  id: number;
  type: string;
  summary: string;
  created_at: string;
}

export function InteractionTimeline({
  interactions,
}: {
  interactions: TimelineInteraction[];
}) {
  if (interactions.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "30px 0",
          color: "rgba(232,224,212,0.3)",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        No interactions logged yet.
      </div>
    );
  }

  // Sort chronologically (newest first)
  const sorted = [...interactions].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Build items with gap detection
  const items: Array<
    | { kind: "interaction"; data: TimelineInteraction }
    | { kind: "gap"; days: number }
  > = [];

  for (let i = 0; i < sorted.length; i++) {
    items.push({ kind: "interaction", data: sorted[i] });

    if (i < sorted.length - 1) {
      const current = new Date(sorted[i].created_at).getTime();
      const next = new Date(sorted[i + 1].created_at).getTime();
      const gapDays = Math.floor((current - next) / 86400000);
      if (gapDays > 7) {
        items.push({ kind: "gap", days: gapDays });
      }
    }
  }

  const typeLabels: Record<string, string> = {
    email: "Email",
    meeting: "Meeting",
    call: "Call",
    note: "Note",
  };

  return (
    <div style={{ position: "relative", paddingLeft: 24 }}>
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          left: 7,
          top: 8,
          bottom: 8,
          width: 2,
          background: "rgba(196,151,59,0.1)",
          borderRadius: 1,
        }}
      />

      {items.map((item, idx) => {
        if (item.kind === "gap") {
          return (
            <div
              key={`gap-${idx}`}
              style={{
                position: "relative",
                padding: "8px 0",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* Dotted line overlay */}
              <div
                style={{
                  position: "absolute",
                  left: -17,
                  width: 2,
                  height: "100%",
                  background: "repeating-linear-gradient(to bottom, rgba(196,151,59,0.2) 0px, rgba(196,151,59,0.2) 3px, transparent 3px, transparent 7px)",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(232,224,212,0.25)",
                  fontStyle: "italic",
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "rgba(232,224,212,0.04)",
                  border: "1px dashed rgba(196,151,59,0.12)",
                }}
              >
                {item.days} day gap
              </span>
            </div>
          );
        }

        const interaction = item.data;
        const dotColor = TYPE_COLORS[interaction.type] || TYPE_COLORS.note;
        const dateStr = new Date(interaction.created_at).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" }
        );
        const timeStr = new Date(interaction.created_at).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit" }
        );

        return (
          <div
            key={interaction.id}
            style={{
              position: "relative",
              padding: "8px 0",
              display: "flex",
              gap: 12,
              alignItems: "start",
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: -20,
                top: 13,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: dotColor,
                border: "2px solid rgba(26,22,17,0.9)",
                zIndex: 1,
                flexShrink: 0,
              }}
            />

            {/* Date label */}
            <div
              style={{
                minWidth: 56,
                fontSize: 10,
                color: "rgba(232,224,212,0.35)",
                fontFamily: "'DM Sans', sans-serif",
                paddingTop: 2,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              <div>{dateStr}</div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>{timeStr}</div>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(196,151,59,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: dotColor,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {typeLabels[interaction.type] || interaction.type}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#E8E0D4",
                  lineHeight: 1.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {interaction.summary}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
