import { useState } from "react";
import type { EmailTemplate } from "../hooks/useTemplates";

interface TemplatesTabProps {
  templates: EmailTemplate[];
  onSave: (t: { name: string; category?: string; subject?: string; body: string }) => Promise<unknown>;
  onDelete: (id: number) => void;
  onUse: (template: EmailTemplate) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "buyer_outreach", label: "Buyer Outreach" },
  { value: "follow_up", label: "Follow-Up" },
  { value: "order_confirmation", label: "Order Confirmation" },
  { value: "meeting", label: "Meeting" },
  { value: "general", label: "General" },
];

export default function TemplatesTab({ templates, onSave, onDelete, onUse, isPro, onUpgrade }: TemplatesTabProps) {
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!isPro) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>{"\u2709"}</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          Email Templates
        </h2>
        <p style={{ fontSize: 13, color: "rgba(232,224,212,0.45)", marginBottom: 24 }}>
          Save and reuse Marie-generated emails. Available on Professional plan.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Upgrade — $29/mo
        </button>
      </div>
    );
  }

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

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600 }}>
          Email Templates
        </h2>
        <button
          onClick={() => setShowNew(!showNew)}
          style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {showNew ? "Cancel" : "+ New Template"}
        </button>
      </div>

      {/* New template form */}
      {showNew && (
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
            placeholder="Email body — paste a Marie-generated email or write your own..."
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

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: filter === c.value ? "1px solid #C4973B" : "1px solid rgba(196,151,59,0.15)",
              background: filter === c.value ? "rgba(196,151,59,0.15)" : "transparent",
              color: filter === c.value ? "#C4973B" : "rgba(232,224,212,0.5)",
              fontSize: 11, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.04em",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Template list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(232,224,212,0.3)", fontSize: 13 }}>
          {templates.length === 0
            ? "No templates yet. Save a Marie-generated email or create one from scratch."
            : "No templates in this category."}
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
              {/* Header */}
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
                      <span style={{ fontSize: 11, color: "rgba(232,224,212,0.4)" }}>
                        {t.subject}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color: "rgba(232,224,212,0.3)", fontSize: 12 }}>
                  {expanded === t.id ? "\u25B2" : "\u25BC"}
                </span>
              </div>

              {/* Expanded body */}
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
                  <div style={{ display: "flex", gap: 8 }}>
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
                      onClick={() => {
                        navigator.clipboard.writeText(t.body);
                      }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid rgba(196,151,59,0.2)",
                        background: "transparent",
                        color: "rgba(232,224,212,0.5)",
                        fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                      }}
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this template?")) onDelete(t.id); }}
                      style={{
                        padding: "8px 16px", borderRadius: 8,
                        border: "1px solid rgba(232,115,90,0.2)",
                        background: "transparent",
                        color: "#E8735A",
                        fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        marginLeft: "auto",
                      }}
                    >
                      Delete
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
