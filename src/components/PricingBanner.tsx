interface PricingBannerProps {
  tier: string;
  usage: { used: number; limit: number; remaining: number } | null;
  onUpgrade: () => void;
  onManage: () => void;
}

export default function PricingBanner({ tier, usage, onUpgrade, onManage }: PricingBannerProps) {
  if (tier === "professional") {
    return (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 20px", borderRadius: 10,
        background: "rgba(196,151,59,0.08)", border: "1px solid rgba(196,151,59,0.15)",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#C4973B", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Professional
          </span>
          {usage && (
            <span style={{ fontSize: 11, color: "rgba(232,224,212,0.4)" }}>
              {usage.used}/{usage.limit} messages today
            </span>
          )}
        </div>
        <button onClick={onManage} style={{
          background: "none", border: "none", color: "rgba(232,224,212,0.4)",
          fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}>
          Manage billing
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 20px", borderRadius: 10,
      background: "linear-gradient(135deg, rgba(139,105,20,0.15), rgba(196,151,59,0.08))",
      border: "1px solid rgba(196,151,59,0.2)",
      marginBottom: 16,
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#E8E0D4", fontWeight: 600 }}>
          Upgrade to Professional
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,224,212,0.4)", marginTop: 2 }}>
          {usage ? `${usage.remaining} of ${usage.limit} free messages remaining today` : "Unlock Gmail, Calendar, and 100 messages/day"}
          {" \u2014 "}$29/mo
        </div>
      </div>
      <button onClick={onUpgrade} style={{
        padding: "8px 18px", borderRadius: 8, border: "none",
        background: "linear-gradient(135deg, #8B6914, #C4973B)",
        color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Upgrade
      </button>
    </div>
  );
}
