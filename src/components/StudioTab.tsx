import { useState, useEffect, useRef } from "react";

interface StudioTabProps {
  token: string | null;
  isPro: boolean;
  onUpgrade: () => void;
  onSendToChat: (text: string) => void;
  onSaveTemplate: (template: { name: string; subject: string; body: string; category: string }) => void;
  brandName?: string;
}

interface ToolCard {
  id: string;
  label: string;
  icon: string;
  accent: string;
  description: string;
  placeholder: string;
  systemPrompt: string;
  templateCategory: string;
}

const TOOLS: ToolCard[] = [
  {
    id: "social",
    label: "Social Captions",
    icon: "\u2726",
    accent: "#E8A0BF",
    description: "Launch posts, product highlights, brand moments",
    placeholder: "Describe the product, campaign, or moment you want to post about...",
    systemPrompt:
      "You are a beauty brand social media expert. Write engaging Instagram/TikTok captions for a beauty brand. Include relevant hashtags. Tone: aspirational but approachable. Provide 3 caption variants (short, medium, long) with emojis and hashtags. Format each clearly with a heading.",
    templateCategory: "general",
  },
  {
    id: "subjects",
    label: "Email Subject Lines",
    icon: "\u2709",
    accent: "#D4C5A0",
    description: "A/B variants scored for open rate",
    placeholder: "What is the email about? Include product names, offers, or the audience...",
    systemPrompt:
      "You are an email marketing specialist for beauty brands. Generate 8 email subject line variants for A/B testing. For each, provide an estimated open-rate score (1-10) and explain why it works. Include a mix of curiosity-driven, benefit-led, and urgency-based approaches. Format as a numbered list with the score in brackets.",
    templateCategory: "buyer_outreach",
  },
  {
    id: "press",
    label: "Press Releases",
    icon: "\u25C6",
    accent: "#A0C4A8",
    description: "Product launch announcements in your voice",
    placeholder: "Product name, key ingredients, launch date, what makes it unique...",
    systemPrompt:
      "You are a beauty industry PR writer. Write a professional press release for a beauty brand product launch. Include: headline, subheadline, dateline, 3-4 body paragraphs (the story, product details, quotes placeholder, availability), and boilerplate. Use AP style. Tone: polished, exciting, newsworthy.",
    templateCategory: "general",
  },
  {
    id: "thankyou",
    label: "Buyer Thank-Yous",
    icon: "\u2665",
    accent: "#E8A088",
    description: "Personalized notes after meetings",
    placeholder: "Buyer name, company, what you discussed, any next steps...",
    systemPrompt:
      "You are a relationship-building expert for beauty brands. Write a warm, personalized thank-you note to a retail buyer after a meeting. Reference specific discussion points. Include a subtle next-step CTA. Tone: genuine, professional, memorable. Keep it concise (150-200 words).",
    templateCategory: "follow_up",
  },
  {
    id: "descriptions",
    label: "Product Descriptions",
    icon: "\u25C9",
    accent: "#B0A0D4",
    description: "Compelling copy for retail and DTC",
    placeholder: "Product name, type, key ingredients, target customer, price point...",
    systemPrompt:
      "You are a beauty copywriter specializing in product descriptions. Write compelling product copy in three formats: 1) Short (50 words) for retail shelf tags, 2) Medium (100 words) for e-commerce listings, 3) Long (200 words) for brand website with sensory language. Highlight ingredients, benefits, and the transformation promise. Tone: luxurious yet accessible.",
    templateCategory: "general",
  },
  {
    id: "pitch",
    label: "Pitch Scripts",
    icon: "\u25B8",
    accent: "#C4973B",
    description: "Talking points for buyer calls",
    placeholder: "Who are you pitching to? What products? What objections might they have?",
    systemPrompt:
      "You are a sales coach for beauty brand founders. Create a structured pitch script for a buyer call. Include: opening hook (15 sec), brand story (30 sec), product highlights with differentiators, market data talking points, objection handlers, and a confident close. Format with clear sections and suggested timing. Tone: confident, knowledgeable, passionate.",
    templateCategory: "meeting",
  },
];

const STARTER_BRIEFS = [
  {
    label: "Retail follow-up",
    tool: "thankyou",
    text: "Write a warm follow-up after a buyer meeting. We discussed hero SKUs, clean artistry positioning, and a next step of sending a line sheet this week.",
  },
  {
    label: "Launch caption",
    tool: "social",
    text: "Create launch captions for a complexion product that blurs texture, works across skin tones, and feels editorial but wearable.",
  },
  {
    label: "Buyer pitch",
    tool: "pitch",
    text: "Build a concise buyer call script for pitching three hero products to a specialty beauty retailer. Include likely objections around shelf space and differentiation.",
  },
];

function PulsingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#C4973B",
            animation: `studiopulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes studiopulse { 0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
    </span>
  );
}

export default function StudioTab({ token, isPro, onUpgrade, onSendToChat, onSaveTemplate, brandName }: StudioTabProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (selected && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  if (!isPro) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>{"\u2728"}</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Studio
        </h2>
        <p style={{ fontSize: 13, color: "rgba(232,224,212,0.7)", marginBottom: 24 }}>
          Brand-aware creative tools for social captions, press releases, pitch scripts, and more. Available on Professional plan.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Upgrade — $29/mo
        </button>
      </div>
    );
  }

  const selectedTool = TOOLS.find((t) => t.id === selected);

  const applyStarterBrief = (brief: (typeof STARTER_BRIEFS)[number]) => {
    setSelected(brief.tool);
    setContext(brief.text);
    setResult("");
    setCopied(false);
  };

  const handleGenerate = async () => {
    if (!selectedTool || !token) return;
    setGenerating(true);
    setResult("");
    setCopied(false);

    const brandContext = brandName ? ` The brand name is "${brandName}".` : "";
    const userMessage = context.trim()
      ? context.trim()
      : `Generate ${selectedTool.label.toLowerCase()} for a beauty brand.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          system: selectedTool.systemPrompt + brandContext,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      const text =
        data.reply ||
        (Array.isArray(data.content)
          ? data.content.map((block: { text?: string }) => block.text || "").join("\n").trim()
          : data.content) ||
        (data.choices && data.choices[0]?.message?.content) ||
        "";
      setResult(text);
    } catch {
      setResult("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handleSendToChat = () => {
    onSendToChat(result);
  };

  const handleSaveTemplate = () => {
    if (!selectedTool) return;
    onSaveTemplate({
      name: `${selectedTool.label} — Studio`,
      subject: "",
      body: result,
      category: selectedTool.templateCategory,
    });
  };

  const handleCardClick = (id: string) => {
    if (selected === id) {
      setSelected(null);
    } else {
      setSelected(id);
      setResult("");
      setContext("");
      setCopied(false);
    }
  };

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            marginBottom: 4,
          }}
        >
          Studio
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "rgba(232,224,212,0.7)",
            margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Brand-aware creative tools with reusable outputs for chat and templates.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 22,
        }}
      >
        {STARTER_BRIEFS.map((brief) => (
          <button
            key={brief.label}
            onClick={() => applyStarterBrief(brief)}
            style={{
              minHeight: 76,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(196,151,59,0.14)",
              background: "rgba(0,0,0,0.18)",
              color: "#E8E0D4",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{ fontSize: 11, color: "#C4973B", fontWeight: 700, marginBottom: 6 }}>
              STARTER BRIEF
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{brief.label}</div>
          </button>
        ))}
      </div>

      {/* Tool Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {TOOLS.map((tool, i) => {
          const isSelected = selected === tool.id;
          return (
            <div
              key={tool.id}
              onClick={() => handleCardClick(tool.id)}
              style={{
                padding: "18px 20px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: isSelected
                  ? `1px solid ${tool.accent}55`
                  : "1px solid rgba(196,151,59,0.1)",
                borderLeft: `3px solid ${isSelected ? tool.accent : tool.accent + "66"}`,
                backdropFilter: "blur(12px)",
                cursor: "pointer",
                transition: "all 0.25s ease",
                transform: mounted
                  ? isSelected
                    ? "scale(1.02)"
                    : "translateY(0)"
                  : "translateY(16px)",
                opacity: mounted ? 1 : 0,
                transitionDelay: mounted ? `${i * 60}ms` : "0ms",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = `${tool.accent}33`;
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(196,151,59,0.1)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18, color: tool.accent, lineHeight: 1 }}>{tool.icon}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isSelected ? tool.accent : "rgba(232,224,212,0.85)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {tool.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(232,224,212,0.7)",
                  lineHeight: 1.4,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {tool.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generation Form */}
      {selectedTool && (
        <div
          ref={formRef}
          style={{
            borderRadius: 16,
            border: `1px solid ${selectedTool.accent}33`,
            background: "rgba(255,255,255,0.02)",
            padding: 24,
            animation: "studioFadeIn 0.3s ease",
          }}
        >
          <style>{`@keyframes studioFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: selectedTool.accent }}>{selectedTool.icon}</span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {selectedTool.label}
            </span>
          </div>

          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={selectedTool.placeholder}
            rows={4}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.12)",
              background: "rgba(0,0,0,0.2)",
              color: "rgba(232,224,212,0.85)",
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = `${selectedTool.accent}44`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(196,151,59,0.12)";
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              marginTop: 14,
              padding: "10px 28px",
              borderRadius: 10,
              border: "none",
              background: generating
                ? "rgba(196,151,59,0.3)"
                : "linear-gradient(135deg, #8B6914, #C4973B)",
              color: generating ? "rgba(232,224,212,0.75)" : "#1A1611",
              fontWeight: 700,
              fontSize: 13,
              cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s ease",
            }}
          >
            {generating ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Generating <PulsingDots />
              </span>
            ) : (
              "Generate"
            )}
          </button>

          {/* Result Output */}
          {result && !generating && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 12,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(196,151,59,0.08)",
                animation: "studioFadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(232,224,212,0.8)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 16,
                }}
              >
                {result}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(196,151,59,0.2)",
                    background: copied ? "rgba(160,196,168,0.15)" : "rgba(255,255,255,0.04)",
                    color: copied ? "#A0C4A8" : "rgba(232,224,212,0.6)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s ease",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>

                <button
                  onClick={handleSendToChat}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(196,151,59,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(232,224,212,0.6)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s ease",
                  }}
                >
                  Send to Chat
                </button>

                <button
                  onClick={handleSaveTemplate}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid rgba(196,151,59,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(232,224,212,0.6)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.2s ease",
                  }}
                >
                  Save as Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
