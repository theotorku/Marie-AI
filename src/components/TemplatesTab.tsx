import { useState } from "react";
import type { EmailTemplate } from "../hooks/useTemplates";

interface TemplatesTabProps {
  templates: EmailTemplate[];
  onSave: (t: { name: string; category?: string; subject?: string; body: string }) => Promise<unknown>;
  onDelete: (id: number) => void;
  onUse: (template: EmailTemplate) => void;
  isPro: boolean;
  onUpgrade: () => void;
  onNavigate?: (tab: string) => void;
  onStartSetup?: () => void;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "buyer_outreach", label: "Buyer Outreach" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "meeting", label: "Meeting" },
  { value: "general", label: "General" },
];

const STARTER_TEMPLATES = [
  {
    name: "Buyer Introduction",
    category: "buyer_outreach",
    subject: "Introducing our beauty line",
    body: "Hi [Name],\n\nI wanted to introduce our beauty line and share a few hero products that may be a fit for [Retailer]. Our positioning centers on artistry, inclusive shade performance, and products that are easy for teams to explain on the floor.\n\nI would be happy to send a concise line sheet and samples for your review.\n\nWarmly,\n[Your Name]",
  },
  {
    name: "Post-Meeting Follow-Up",
    category: "follow_up",
    subject: "Thank you for your time",
    body: "Hi [Name],\n\nThank you again for taking the time to meet today. I appreciated learning more about your priorities and where our products could support your assortment.\n\nAs discussed, I will send the line sheet, hero SKU details, and the next-step materials for your review.\n\nWarmly,\n[Your Name]",
  },
  {
    name: "Sample Check-In",
    category: "follow_up",
    subject: "Checking in on samples",
    body: "Hi [Name],\n\nI wanted to check in and see whether you had a chance to review the samples. I would love to hear what resonated, what questions came up, and whether there is anything else your team needs from me.\n\nHappy to make next steps easy.\n\nWarmly,\n[Your Name]",
  },
];

export default function TemplatesTab({
  templates,
  onSave,
  onDelete,
  onUse,
  isPro,
  onUpgrade,
  onNavigate,
  onStartSetup,
}: TemplatesTabProps) {
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = filter === "all" ? templates : templates.filter((t) => t.category === filter);

  const handleSave = async () => {
    if (!newName.trim() || !newBody.trim()) return;
    await onSave({ name: newName.trim(), category: newCategory, subject: newSubject.trim(), body: newBody.trim() });
    setNewName("");
    setNewCategory("general");
    setNewSubject("");
    setNewBody("");
    setShowNew(false);
  };

  const installStarterTemplates = async () => {
    for (const template of STARTER_TEMPLATES) {
      await onSave(template);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600 }}>
          Email Templates
        </h2>
        <button
          onClick={() => (isPro ? setShowNew(!showNew) : onUpgrade())}
          style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {isPro ? (showNew ? "Cancel" : "+ New Template") : "Upgrade to Create"}
        </button>
      </div>

      {!isPro && (
        <div style={{
          padding: "14px 16px", borderRadius: 12,
          border: "1px solid rgba(196,151,59,0.16)",
          background: "rgba(196,151,59,0.06)",
          color: "rgba(232,224,212,0.75)",
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 18,
        }}>
          Read-only mode. You can view, copy, and use saved templates; creating or deleting templates requires Professional.
        </div>
      )}

      {showNew && isPro && (
        <div style={{
          padding: 20, borderRadius: 14,
          border: "1px solid rgba(196,151,59,0.2)",
          background: "rgba(196,151,59,0.04)",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Template name..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
                color: "#E8E0D4", fontSize: 13, outline: "none",
              }}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{
                padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(196,151,59,0.2)", background: "rgba(30,25,20,0.9)",
                color: "#C4973B", fontSize: 11, outline: "none", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600,
              }}
            >
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Email subject line..."
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
              color: "#E8E0D4", fontSize: 13, outline: "none", marginBottom: 12,
              boxSizing: "border-box",
            }}
          />
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Email body - paste a Marie-generated email or write your own..."
            rows={6}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
              color: "#E8E0D4", fontSize: 13, outline: "none", resize: "vertical",
              lineHeight: 1.5, marginBottom: 12, boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim() || !newBody.trim()}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: !newName.trim() || !newBody.trim() ? "rgba(196,151,59,0.2)" : "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: !newName.trim() || !newBody.trim() ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Save Template
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: filter === c.value ? "1px solid #C4973B" : "1px solid rgba(196,151,59,0.15)",
              background: filter === c.value ? "rgba(196,151,59,0.15)" : "transparent",
              color: filter === c.value ? "#C4973B" : "rgba(232,224,212,0.75)",
              fontSize: 11, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.04em",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "44px 20px", color: "rgba(232,224,212,0.68)", fontSize: 13 }}>
          {templates.length === 0 ? (
            <>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 19, color: "#E8E0D4", fontWeight: 600, marginBottom: 8 }}>
                Build your reusable outreach shelf
              </div>
              <div style={{ maxWidth: 430, margin: "0 auto 18px", lineHeight: 1.6 }}>
                Start with buyer intro, post-meeting follow-up, and sample check-in templates so Marie has something useful to personalize.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {isPro && (
                  <button
                    onClick={installStarterTemplates}
                    style={{
                      padding: "10px 18px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #8B6914, #C4973B)",
                      color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Add Starter Templates
                  </button>
                )}
                <button
                  onClick={isPro ? (onStartSetup || (() => setShowNew(true))) : onUpgrade}
                  style={{
                    padding: "10px 18px", borderRadius: 10,
                    border: "1px solid rgba(196,151,59,0.25)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#C4973B", fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}
                >
                  {isPro ? "Create Custom Template" : "Upgrade to Create"}
                </button>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate("studio")}
                    style={{
                      padding: "10px 18px", borderRadius: 10,
                      border: "1px solid rgba(196,151,59,0.16)",
                      background: "transparent",
                      color: "rgba(232,224,212,0.75)", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Open Studio
                  </button>
                )}
              </div>
            </>
          ) : (
            "No templates in this category."
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((t) => (
            <div
              key={t.id}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(196,151,59,0.1)",
                background: "rgba(255,255,255,0.02)",
                overflow: "hidden",
              }}
            >
              <div
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                style={{
                  padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D4" }}>{t.name}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontSize: 10, color: "#C4973B", textTransform: "uppercase",
                      letterSpacing: "0.06em", fontWeight: 600,
                    }}>
                      {CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                    </span>
                    {t.subject && (
                      <span style={{ fontSize: 11, color: "rgba(232,224,212,0.7)" }}>
                        {t.subject}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color: "rgba(232,224,212,0.6)", fontSize: 12 }}>
                  {expanded === t.id ? "\u25B2" : "\u25BC"}
                </span>
              </div>

              {expanded === t.id && (
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{
                    padding: 14, borderRadius: 10,
                    background: "rgba(0,0,0,0.3)",
                    fontSize: 12, color: "rgba(232,224,212,0.7)",
                    lineHeight: 1.6, whiteSpace: "pre-wrap",
                    marginBottom: 12, maxHeight: 300, overflow: "auto",
                  }}>
                    {t.body}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => onUse(t)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg, #8B6914, #C4973B)",
                        color: "#1A1611", fontWeight: 700, fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Use Template
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(t.body)}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid rgba(196,151,59,0.2)",
                        background: "transparent",
                        color: "rgba(232,224,212,0.75)",
                        fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        if (!isPro) {
                          onUpgrade();
                          return;
                        }
                        if (confirm("Delete this template?")) onDelete(t.id);
                      }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid rgba(232,115,90,0.2)",
                        background: "transparent",
                        color: isPro ? "#E8735A" : "#C4973B",
                        fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        marginLeft: "auto",
                      }}
                    >
                      {isPro ? "Delete" : "Upgrade to Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
