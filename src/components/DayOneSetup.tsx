interface DayOneSetupProps {
  contactsCount: number;
  openTasksCount: number;
  templatesCount: number;
  marieScore: number | null;
  isPro: boolean;
  onNavigate: (tab: string) => void;
  onStartContact?: () => void;
  onStartTask?: () => void;
  onStartTemplate?: () => void;
  compact?: boolean;
}

export default function DayOneSetup({
  contactsCount,
  openTasksCount,
  templatesCount,
  marieScore,
  isPro,
  onNavigate,
  onStartContact,
  onStartTask,
  onStartTemplate,
  compact = false,
}: DayOneSetupProps) {
  const steps = [
    {
      label: "Add first buyer",
      detail: "Creates pipeline signal",
      done: contactsCount > 0,
      action: isPro ? onStartContact : () => onNavigate("settings"),
      actionLabel: isPro ? "Add contact" : "Upgrade",
    },
    {
      label: "Create one priority task",
      detail: "Gives Marie a next action",
      done: openTasksCount > 0,
      action: onStartTask,
      actionLabel: "Add task",
    },
    {
      label: "Save an outreach template",
      detail: "Speeds up follow-ups",
      done: templatesCount > 0,
      action: isPro ? onStartTemplate : () => onNavigate("settings"),
      actionLabel: isPro ? "Start template" : "Upgrade",
    },
    {
      label: "Review Marie Score",
      detail: marieScore === null ? "Score appears after setup" : `${marieScore}/100 today`,
      done: (marieScore ?? 0) > 0,
      action: () => onNavigate("home"),
      actionLabel: "View score",
    },
  ];

  const completed = steps.filter((step) => step.done).length;

  return (
    <section
      aria-label="Day one setup"
      style={{
        padding: compact ? "16px 18px" : "20px 22px",
        borderRadius: 14,
        border: "1px solid rgba(196,151,59,0.14)",
        background: "linear-gradient(135deg, rgba(196,151,59,0.08), rgba(255,255,255,0.025))",
        marginBottom: compact ? 18 : 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: compact ? 18 : 21, fontWeight: 600 }}>
            Day One Setup
          </div>
          <div style={{ fontSize: 12, color: "rgba(232,224,212,0.68)", marginTop: 4, lineHeight: 1.5 }}>
            Complete these basics to move Marie Score off zero and make the assistant useful immediately.
          </div>
        </div>
        <div style={{ color: "#C4973B", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", marginTop: 4 }}>
          {completed}/4
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {steps.map((step) => (
          <button
            key={step.label}
            onClick={step.done ? undefined : step.action}
            disabled={step.done || !step.action}
            style={{
              textAlign: "left",
              minHeight: 92,
              padding: "12px 13px",
              borderRadius: 10,
              border: step.done ? "1px solid rgba(122,158,126,0.28)" : "1px solid rgba(196,151,59,0.12)",
              background: step.done ? "rgba(122,158,126,0.08)" : "rgba(0,0,0,0.18)",
              color: "#E8E0D4",
              cursor: step.done || !step.action ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{ fontSize: 10, color: step.done ? "#7A9E7E" : "#C4973B", fontWeight: 700, marginBottom: 8 }}>
              {step.done ? "DONE" : step.actionLabel.toUpperCase()}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{step.label}</div>
            <div style={{ fontSize: 11, color: "rgba(232,224,212,0.62)", lineHeight: 1.35, marginTop: 5 }}>
              {step.detail}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
