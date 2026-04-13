import { useState } from "react";

interface OnboardingProps {
  userName: string;
  tier: string;
  googleConnected: boolean;
  onConnectGoogle: () => void;
  onUpgrade: () => void;
  onComplete: () => void;
  onSendMessage: (msg: string) => void;
}

const STEPS = [
  { id: "welcome", title: "Welcome to Marie AI", icon: "\u2726" },
  { id: "connect", title: "Connect Your Tools", icon: "\u{1F517}" },
  { id: "try", title: "Try Marie", icon: "\u{1F4AC}" },
  { id: "explore", title: "Explore Features", icon: "\u{1F680}" },
];

export default function Onboarding({
  userName, tier, googleConnected, onConnectGoogle, onUpgrade, onComplete, onSendMessage,
}: OnboardingProps) {
  const [step, setStep] = useState(0);
  const firstName = userName.split(" ")[0];

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "linear-gradient(160deg, #1A1611 0%, #0D0B09 40%, #14110E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", color: "#E8E0D4",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 520, width: "100%", padding: "0 24px", animation: "fadeUp 0.4s ease-out" }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "#C4973B" : "rgba(196,151,59,0.2)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u2726"}</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontWeight: 600, marginBottom: 12 }}>
              Welcome, {firstName}
            </h1>
            <p style={{ fontSize: 15, color: "rgba(232,224,212,0.6)", lineHeight: 1.7, marginBottom: 32 }}>
              Marie AI is your personal assistant for the beauty industry — draft emails, prep for meetings, manage buyers, and stay on top of your day.
            </p>
            <button onClick={next} style={{
              padding: "14px 40px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 15, cursor: "pointer",
              letterSpacing: "0.02em",
            }}>Get Started</button>
          </div>
        )}

        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u{1F517}"}</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 12 }}>
              Connect Your Tools
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,212,0.75)", marginBottom: 28 }}>
              Link your accounts to unlock the full power of Marie AI.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              <div style={{
                padding: "16px 20px", borderRadius: 12,
                border: `1px solid ${googleConnected ? "rgba(76,175,80,0.3)" : "rgba(196,151,59,0.2)"}`,
                background: googleConnected ? "rgba(76,175,80,0.06)" : "rgba(255,255,255,0.03)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Google</div>
                  <div style={{ fontSize: 11, color: "rgba(232,224,212,0.7)" }}>Gmail & Calendar</div>
                </div>
                {googleConnected ? (
                  <span style={{ color: "#4CAF50", fontSize: 12, fontWeight: 600 }}>Connected</span>
                ) : (
                  <button onClick={onConnectGoogle} style={{
                    padding: "8px 16px", borderRadius: 8,
                    border: "1px solid rgba(196,151,59,0.3)",
                    background: "rgba(196,151,59,0.08)", color: "#C4973B",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>Connect</button>
                )}
              </div>

              {tier === "free" && (
                <div style={{
                  padding: "16px 20px", borderRadius: 12,
                  border: "1px solid rgba(196,151,59,0.15)",
                  background: "linear-gradient(135deg, rgba(139,105,20,0.08), rgba(196,151,59,0.04))",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Professional Plan</div>
                    <div style={{ fontSize: 11, color: "rgba(232,224,212,0.7)" }}>Unlock Slack, CRM, agent, templates & more</div>
                  </div>
                  <button onClick={onUpgrade} style={{
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg, #8B6914, #C4973B)",
                    color: "#1A1611", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>$29/mo</button>
                </div>
              )}
            </div>

            <button onClick={next} style={{
              padding: "14px 40px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 15, cursor: "pointer",
            }}>Continue</button>
            <div>
              <button onClick={next} style={{
                background: "none", border: "none", color: "rgba(232,224,212,0.65)",
                fontSize: 12, cursor: "pointer", marginTop: 12,
              }}>Skip for now</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u{1F4AC}"}</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 12 }}>
              Try Asking Marie
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,212,0.75)", marginBottom: 28 }}>
              Tap any prompt below to see Marie in action.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {[
                { label: "Draft a buyer email", prompt: "Help me draft a professional introduction email to a retail buyer at Sephora about our product line." },
                { label: "Meeting prep", prompt: "Help me prepare talking points for a quarterly business review with a retail partner." },
                { label: "Product knowledge", prompt: "What are our top 3 hero SKUs? Give me the key selling points for each." },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { onSendMessage(item.prompt); onComplete(); }}
                  style={{
                    padding: "14px 20px", borderRadius: 12, textAlign: "left",
                    border: "1px solid rgba(196,151,59,0.15)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#E8E0D4", fontSize: 13, cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ color: "#C4973B", marginRight: 8 }}>{"\u2192"}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <button onClick={next} style={{
              padding: "14px 40px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 15, cursor: "pointer",
            }}>Continue</button>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>{"\u{1F680}"}</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontWeight: 600, marginBottom: 12 }}>
              You're All Set
            </h2>
            <p style={{ fontSize: 14, color: "rgba(232,224,212,0.75)", lineHeight: 1.7, marginBottom: 28 }}>
              Here's what you can do with Marie AI:
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32,
              textAlign: "left",
            }}>
              {[
                { icon: "\u2726", label: "AI Chat", desc: "Draft emails, prep meetings, get advice" },
                { icon: "\u2709", label: "Email & Calendar", desc: "Read, send, and schedule" },
                { icon: "\u25C8", label: "Contacts & CRM", desc: "Track buyers and deals" },
                { icon: "\u{1F514}", label: "Proactive Agent", desc: "Daily briefings and nudges" },
                { icon: "\u2709", label: "Email Templates", desc: "Save and reuse emails" },
                { icon: "\u25CF", label: "Analytics", desc: "Track your productivity" },
              ].map((f) => (
                <div key={f.label} style={{
                  padding: "12px 14px", borderRadius: 10,
                  border: "1px solid rgba(196,151,59,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}>
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: "rgba(232,224,212,0.7)", marginTop: 2 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <button onClick={onComplete} style={{
              padding: "14px 40px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 15, cursor: "pointer",
              letterSpacing: "0.02em",
            }}>Start Using Marie AI</button>
          </div>
        )}
      </div>
    </div>
  );
}
