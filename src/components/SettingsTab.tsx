interface SettingsTabProps {
  // Google
  googleConnected: boolean;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  // Slack
  slackConnected: boolean;
  slackTeamName: string | null;
  onSlackConnect: () => void;
  onSlackDisconnect: () => void;
  // Tier
  tier: string;
  onUpgrade: () => void;
}

function ConnectionCard({
  name,
  description,
  connected,
  detail,
  onConnect,
  onDisconnect,
  requiresPro,
  isPro,
  onUpgrade,
}: {
  name: string;
  description: string;
  connected: boolean;
  detail?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  requiresPro: boolean;
  isPro: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 14,
        border: "1px solid rgba(196,151,59,0.12)",
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#E8E0D4", marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: "rgba(232,224,212,0.45)" }}>
          {connected ? (detail || "Connected") : description}
        </div>
      </div>
      {requiresPro && !isPro ? (
        <button
          onClick={onUpgrade}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611",
            fontWeight: 700,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Upgrade
        </button>
      ) : connected ? (
        <button
          onClick={onDisconnect}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid rgba(232,115,90,0.3)",
            background: "transparent",
            color: "#E8735A",
            fontWeight: 600,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          style={{
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid rgba(196,151,59,0.3)",
            background: "rgba(196,151,59,0.08)",
            color: "#C4973B",
            fontWeight: 600,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Connect
        </button>
      )}
    </div>
  );
}

export default function SettingsTab({
  googleConnected,
  onGoogleConnect,
  onGoogleDisconnect,
  slackConnected,
  slackTeamName,
  onSlackConnect,
  onSlackDisconnect,
  tier,
  onUpgrade,
}: SettingsTabProps) {
  const isPro = tier === "professional";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 24,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Settings
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "rgba(232,224,212,0.4)",
          marginBottom: 28,
        }}
      >
        Manage your integrations and account settings.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "rgba(232,224,212,0.35)",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Integrations
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ConnectionCard
            name="Google"
            description="Connect Gmail & Calendar with one click."
            connected={googleConnected}
            detail="Gmail & Calendar connected"
            onConnect={onGoogleConnect}
            onDisconnect={onGoogleDisconnect}
            requiresPro={true}
            isPro={isPro}
            onUpgrade={onUpgrade}
          />

          <ConnectionCard
            name="Slack"
            description="Chat with Marie AI in Slack and receive notifications."
            connected={slackConnected}
            detail={slackTeamName ? `Connected to ${slackTeamName}` : "Connected"}
            onConnect={onSlackConnect}
            onDisconnect={onSlackDisconnect}
            requiresPro={true}
            isPro={isPro}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "rgba(232,224,212,0.35)",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Plan
        </div>
        <div
          style={{
            padding: "20px 24px",
            borderRadius: 14,
            border: "1px solid rgba(196,151,59,0.12)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#E8E0D4" }}>
                {isPro ? "Professional" : "Essentials (Free)"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(232,224,212,0.45)", marginTop: 4 }}>
                {isPro
                  ? "Claude Sonnet 4.6 · 100 msgs/day · All integrations"
                  : "Claude Haiku 4.5 · 20 msgs/day · Limited features"}
              </div>
            </div>
            {!isPro && (
              <button
                onClick={onUpgrade}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #8B6914, #C4973B)",
                  color: "#1A1611",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Upgrade — $29/mo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
