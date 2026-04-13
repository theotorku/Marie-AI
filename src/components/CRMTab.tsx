import { useState, useEffect } from "react";
import type { Contact, Interaction } from "../hooks/useCRM";

interface CRMTabProps {
  contacts: Contact[];
  onAdd: (c: Partial<Contact>) => Promise<unknown>;
  onUpdate: (id: number, c: Partial<Contact>) => Promise<unknown>;
  onDelete: (id: number) => void;
  onGetInteractions: (id: number) => Promise<Interaction[]>;
  onAddInteraction: (id: number, type: string, summary: string) => Promise<unknown>;
  onAskMarie: (prompt: string) => void;
  isPro: boolean;
  onUpgrade: () => void;
}

const STAGES = [
  { value: "all", label: "All", color: "" },
  { value: "lead", label: "Lead", color: "rgba(232,224,212,0.75)" },
  { value: "pitched", label: "Pitched", color: "#5BA4E8" },
  { value: "negotiating", label: "Negotiating", color: "#C4973B" },
  { value: "closed", label: "Closed", color: "#4CAF50" },
  { value: "lost", label: "Lost", color: "#E8735A" },
];

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function CRMTab({
  contacts, onAdd, onUpdate, onDelete, onGetInteractions, onAddInteraction, onAskMarie, isPro, onUpgrade,
}: CRMTabProps) {
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newInterType, setNewInterType] = useState("note");
  const [newInterSummary, setNewInterSummary] = useState("");

  // New contact form
  const [form, setForm] = useState<{ name: string; company: string; role: string; email: string; phone: string; stage: Contact["stage"]; notes: string }>({ name: "", company: "", role: "", email: "", phone: "", stage: "lead", notes: "" });

  if (!isPro) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>{"\u{1F4C7}"}</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Contacts & Pipeline</h2>
        <p style={{ fontSize: 13, color: "rgba(232,224,212,0.7)", marginBottom: 24 }}>
          Track buyers, manage deals, and log interactions. Available on Professional plan.
        </p>
        <button onClick={onUpgrade} style={{
          padding: "10px 24px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #8B6914, #C4973B)",
          color: "#1A1611", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>Upgrade — $29/mo</button>
      </div>
    );
  }

  const filtered = filter === "all" ? contacts : contacts.filter((c) => c.stage === filter);
  const selectedContact = contacts.find((c) => c.id === selected);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await onAdd(form);
    setForm({ name: "", company: "", role: "", email: "", phone: "", stage: "lead", notes: "" });
    setShowNew(false);
  };

  const openContact = async (id: number) => {
    setSelected(id);
    const data = await onGetInteractions(id);
    setInteractions(data);
  };

  const handleAddInteraction = async () => {
    if (!newInterSummary.trim() || !selected) return;
    await onAddInteraction(selected, newInterType, newInterSummary.trim());
    const data = await onGetInteractions(selected);
    setInteractions(data);
    setNewInterSummary("");
  };

  // Pipeline summary
  const pipelineCounts = STAGES.filter((s) => s.value !== "all").map((s) => ({
    ...s,
    count: contacts.filter((c) => c.stage === s.value).length,
  }));

  // Contact detail view
  if (selectedContact) {
    const stageInfo = STAGES.find((s) => s.value === selectedContact.stage);
    return (
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "none", border: "none", color: "#C4973B",
            fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >{"\u2190"} Back to contacts</button>

        {/* Contact header */}
        <div style={{
          padding: 24, borderRadius: 14,
          border: "1px solid rgba(196,151,59,0.12)", background: "rgba(255,255,255,0.02)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600 }}>{selectedContact.name}</div>
              {selectedContact.company && <div style={{ fontSize: 14, color: "rgba(232,224,212,0.6)", marginTop: 4 }}>{selectedContact.role ? `${selectedContact.role} at ` : ""}{selectedContact.company}</div>}
              <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "rgba(232,224,212,0.7)" }}>
                {selectedContact.email && <span>{selectedContact.email}</span>}
                {selectedContact.phone && <span>{selectedContact.phone}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={selectedContact.stage}
                onChange={(e) => onUpdate(selectedContact.id, { stage: e.target.value as Contact["stage"] })}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${stageInfo?.color || "#C4973B"}`,
                  background: "rgba(30,25,20,0.9)",
                  color: stageInfo?.color || "#C4973B",
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                {STAGES.filter((s) => s.value !== "all").map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  onAskMarie(`Help me with my contact ${selectedContact.name}${selectedContact.company ? ` at ${selectedContact.company}` : ""}. They're in the "${selectedContact.stage}" stage. ${selectedContact.notes ? `Notes: ${selectedContact.notes}` : ""} What should my next move be?`);
                }}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #8B6914, #C4973B)",
                  color: "#1A1611", fontWeight: 700, fontSize: 11, cursor: "pointer",
                }}
              >Ask Marie</button>
            </div>
          </div>
          {selectedContact.notes && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.2)", fontSize: 12, color: "rgba(232,224,212,0.55)", lineHeight: 1.5 }}>
              {selectedContact.notes}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: "rgba(232,224,212,0.6)" }}>
            Last contacted: {daysAgo(selectedContact.last_contacted_at)}
          </div>
        </div>

        {/* Add interaction */}
        <div style={{
          padding: 16, borderRadius: 14,
          border: "1px solid rgba(196,151,59,0.1)", background: "rgba(255,255,255,0.02)",
          marginBottom: 16, display: "flex", gap: 8,
        }}>
          <select
            value={newInterType}
            onChange={(e) => setNewInterType(e.target.value)}
            style={{
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.2)", background: "rgba(30,25,20,0.9)",
              color: "#C4973B", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.04em", cursor: "pointer",
            }}
          >
            <option value="note">Note</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
          </select>
          <input
            value={newInterSummary}
            onChange={(e) => setNewInterSummary(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddInteraction()}
            placeholder="Log an interaction..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
              color: "#E8E0D4", fontSize: 13, outline: "none",
            }}
          />
          <button
            onClick={handleAddInteraction}
            disabled={!newInterSummary.trim()}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: !newInterSummary.trim() ? "rgba(196,151,59,0.2)" : "linear-gradient(135deg, #8B6914, #C4973B)",
              color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: !newInterSummary.trim() ? "not-allowed" : "pointer",
            }}
          >Log</button>
        </div>

        {/* Interaction timeline */}
        <div style={{ fontSize: 10, color: "rgba(232,224,212,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>
          Interaction History
        </div>
        {interactions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(232,224,212,0.6)", fontSize: 13 }}>
            No interactions logged yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {interactions.map((i) => {
              const icons: Record<string, string> = { email: "\u2709", meeting: "\u{1F4CB}", call: "\u{1F4DE}", note: "\u{1F4DD}" };
              return (
                <div key={i.id} style={{
                  padding: "12px 16px", borderRadius: 10,
                  border: "1px solid rgba(196,151,59,0.06)", background: "rgba(255,255,255,0.02)",
                  display: "flex", gap: 12, alignItems: "start",
                }}>
                  <span style={{ fontSize: 16 }}>{icons[i.type] || "\u{1F4DD}"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#E8E0D4" }}>{i.summary}</div>
                    <div style={{ fontSize: 10, color: "rgba(232,224,212,0.6)", marginTop: 4 }}>
                      {i.type.charAt(0).toUpperCase() + i.type.slice(1)} · {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 24, fontWeight: 600 }}>Contacts</h2>
        <button onClick={() => setShowNew(!showNew)} style={{
          padding: "8px 18px", borderRadius: 8, border: "none",
          background: "linear-gradient(135deg, #8B6914, #C4973B)",
          color: "#1A1611", fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}>{showNew ? "Cancel" : "+ Add Contact"}</button>
      </div>

      {/* Pipeline summary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {pipelineCounts.map((s) => (
          <div key={s.value} onClick={() => setFilter(filter === s.value ? "all" : s.value)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
            border: filter === s.value ? `1px solid ${s.color}` : "1px solid rgba(196,151,59,0.08)",
            background: filter === s.value ? "rgba(196,151,59,0.06)" : "rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 9, color: "rgba(232,224,212,0.7)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* New contact form */}
      {showNew && (
        <div style={{
          padding: 20, borderRadius: 14, border: "1px solid rgba(196,151,59,0.2)",
          background: "rgba(196,151,59,0.04)", marginBottom: 20,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { key: "name", ph: "Name *" },
              { key: "company", ph: "Company" },
              { key: "role", ph: "Role / Title" },
              { key: "email", ph: "Email" },
              { key: "phone", ph: "Phone" },
            ].map((f) => (
              <input
                key={f.key}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.ph}
                style={{
                  padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
                  color: "#E8E0D4", fontSize: 13, outline: "none",
                  ...(f.key === "name" ? { gridColumn: "1 / -1" } : {}),
                }}
              />
            ))}
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as Contact["stage"] })}
              style={{
                padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(196,151,59,0.2)", background: "rgba(30,25,20,0.9)",
                color: "#C4973B", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.04em", cursor: "pointer",
              }}
            >
              {STAGES.filter((s) => s.value !== "all").map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes..."
            rows={2}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
              color: "#E8E0D4", fontSize: 13, outline: "none", resize: "vertical",
              marginBottom: 12, boxSizing: "border-box",
            }}
          />
          <button onClick={handleAdd} disabled={!form.name.trim()} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: !form.name.trim() ? "rgba(196,151,59,0.2)" : "linear-gradient(135deg, #8B6914, #C4973B)",
            color: "#1A1611", fontWeight: 700, fontSize: 12,
            cursor: !form.name.trim() ? "not-allowed" : "pointer",
          }}>Save Contact</button>
        </div>
      )}

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          {contacts.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>{"\u{1F4C7}"}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#E8E0D4" }}>
                Track your buyers & retailers
              </div>
              <div style={{ fontSize: 13, color: "rgba(232,224,212,0.7)", lineHeight: 1.6, maxWidth: 360, margin: "0 auto 20px" }}>
                Add contacts to manage your pipeline, log interactions, and get AI-powered next-step advice from Marie.
              </div>
              <button onClick={() => setShowNew(true)} style={{
                padding: "10px 24px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #8B6914, #C4973B)",
                color: "#1A1611", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>+ Add Your First Contact</button>
            </>
          ) : (
            <div style={{ color: "rgba(232,224,212,0.6)", fontSize: 13 }}>No contacts in this stage.</div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => {
            const stageInfo = STAGES.find((s) => s.value === c.stage);
            return (
              <div key={c.id} onClick={() => openContact(c.id)} style={{
                padding: "14px 20px", borderRadius: 14,
                border: "1px solid rgba(196,151,59,0.08)", background: "rgba(255,255,255,0.02)",
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "border-color 0.15s",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#E8E0D4" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(232,224,212,0.7)", marginTop: 2 }}>
                    {c.company || "No company"}{c.role ? ` · ${c.role}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 10, color: "rgba(232,224,212,0.6)" }}>
                    {daysAgo(c.last_contacted_at)}
                  </span>
                  <span style={{
                    padding: "4px 10px", borderRadius: 12, fontSize: 9,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: stageInfo?.color, border: `1px solid ${stageInfo?.color}`,
                    background: `${stageInfo?.color}15`,
                  }}>{stageInfo?.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${c.name}?`)) onDelete(c.id); }}
                    style={{
                      background: "none", border: "none", color: "rgba(232,224,212,0.55)",
                      fontSize: 14, cursor: "pointer", padding: "0 4px",
                    }}
                  >{"\u2715"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
