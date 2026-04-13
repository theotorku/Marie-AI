import React, { useMemo } from "react";

interface MarieScoreProps {
  score: number | null;
  breakdown: {
    pipeline: number;
    followUp: number;
    outreach: number;
    taskCompletion: number;
  } | null;
  trend: "up" | "down" | "stable";
  loading: boolean;
}

const RADIUS = 54;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getColor(value: number, max: number): string {
  const pct = max > 0 ? value / max : 0;
  if (pct > 0.7) return "#4CAF50";
  if (pct >= 0.4) return "#C4973B";
  return "#E8735A";
}

function getTip(
  breakdown: MarieScoreProps["breakdown"]
): string {
  if (!breakdown) return "";
  const entries: { key: string; value: number; tip: string }[] = [
    {
      key: "pipeline",
      value: breakdown.pipeline,
      tip: "Add more contacts to your pipeline to boost this score",
    },
    {
      key: "followUp",
      value: breakdown.followUp,
      tip: "You have stale contacts \u2014 reach out this week",
    },
    {
      key: "outreach",
      value: breakdown.outreach,
      tip: "Increase your outreach cadence to stay top of mind",
    },
    {
      key: "taskCompletion",
      value: breakdown.taskCompletion,
      tip: "Clear some tasks to show momentum",
    },
  ];
  entries.sort((a, b) => a.value - b.value);
  return entries[0].tip;
}

const trendSymbol: Record<string, { char: string; color: string }> = {
  up: { char: "\u25B2", color: "#4CAF50" },
  down: { char: "\u25BC", color: "#E8735A" },
  stable: { char: "\u2014", color: "#888" },
};

const fadeUpKeyframes = `
@keyframes marieScoreFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const categories: {
  key: keyof NonNullable<MarieScoreProps["breakdown"]>;
  label: string;
}[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "followUp", label: "Follow-ups" },
  { key: "outreach", label: "Outreach" },
  { key: "taskCompletion", label: "Tasks" },
];

export default function MarieScore({
  score,
  breakdown,
  trend,
  loading,
}: MarieScoreProps) {
  const ringColor = useMemo(
    () => (score !== null ? getColor(score, 100) : "#555"),
    [score]
  );

  const dashOffset = useMemo(() => {
    if (score === null) return CIRCUMFERENCE;
    const pct = Math.min(score, 100) / 100;
    return CIRCUMFERENCE * (1 - pct);
  }, [score]);

  const tip = useMemo(() => getTip(breakdown), [breakdown]);

  const t = trendSymbol[trend];

  return (
    <>
      <style>{fadeUpKeyframes}</style>
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 28,
          animation: "marieScoreFadeUp 0.5s ease-out both",
          maxWidth: 360,
          width: "100%",
        }}
      >
        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "#aaa",
              fontFamily: "'DM Sans', sans-serif",
              padding: 32,
            }}
          >
            Computing score...
          </div>
        ) : (
          <>
            {/* Ring */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <svg
                  width={140}
                  height={140}
                  viewBox="0 0 140 140"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {/* Background ring */}
                  <circle
                    cx={70}
                    cy={70}
                    r={RADIUS}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={STROKE}
                  />
                  {/* Score arc */}
                  <circle
                    cx={70}
                    cy={70}
                    r={RADIUS}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
                  />
                </svg>
                {/* Score number + trend */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 140,
                    height: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: "'Playfair Display', serif",
                      lineHeight: 1,
                    }}
                  >
                    {score !== null ? score : "\u2013"}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      color: t.color,
                      lineHeight: 1,
                      marginTop: 8,
                    }}
                  >
                    {t.char}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "#aaa",
                  marginTop: 8,
                  letterSpacing: 0.5,
                  textTransform: "uppercase" as const,
                }}
              >
                Marie Score
              </span>
            </div>

            {/* Breakdown Grid */}
            {breakdown && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginTop: 24,
                }}
              >
                {categories.map(({ key, label }) => {
                  const val = breakdown[key];
                  const barColor = getColor(val, 25);
                  return (
                    <div key={key}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            color: "#ccc",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            color: "#888",
                          }}
                        >
                          {val}/25
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(val / 25) * 100}%`,
                            height: "100%",
                            borderRadius: 2,
                            background: barColor,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tip */}
            {tip && (
              <div
                style={{
                  marginTop: 20,
                  padding: "10px 14px",
                  background: "rgba(196,151,59,0.08)",
                  borderRadius: 8,
                  borderLeft: "3px solid #C4973B",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "#C4973B",
                    lineHeight: 1.5,
                  }}
                >
                  {tip}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
