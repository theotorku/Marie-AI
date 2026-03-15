interface QuickActionProps {
  label: string;
  onClick: () => void;
}

export default function QuickAction({ label, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 20,
        border: "1px solid rgba(196,151,59,0.3)",
        background: "rgba(196,151,59,0.08)",
        color: "#C4973B",
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
        cursor: "pointer",
        transition: "all 0.2s",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        fontWeight: 600,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(196,151,59,0.2)";
        e.currentTarget.style.borderColor = "rgba(196,151,59,0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(196,151,59,0.08)";
        e.currentTarget.style.borderColor = "rgba(196,151,59,0.3)";
      }}
    >
      {label}
    </button>
  );
}
