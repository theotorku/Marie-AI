import { useState, useEffect, useRef } from "react";
import { CONFIG, TABS } from "./config";
import { PRODUCT_KB } from "./data/products";
import { useChat } from "./hooks/useChat";
import { useAuth } from "./hooks/useAuth";
import { useGoogle } from "./hooks/useGoogle";
import { useTasks } from "./hooks/useTasks";
import { useBilling } from "./hooks/useBilling";
import ChatBubble from "./components/ChatBubble";
import QuickAction from "./components/QuickAction";
import TaskItem from "./components/TaskItem";
import ProductCard from "./components/ProductCard";
import EmailsTab from "./components/EmailsTab";
import CalendarTab from "./components/CalendarTab";
import AuthScreen from "./components/AuthScreen";
import PricingBanner from "./components/PricingBanner";
import type { Task } from "./types";

export default function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const { messages, loading, error, sendMessage } = useChat(auth.token);
  const google = useGoogle(auth.token);
  const taskStore = useTasks(auth.token);
  const billing = useBilling(auth.token);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  const [productFilter, setProductFilter] = useState("all");
  const [time, setTime] = useState(new Date());

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Refresh billing after Stripe checkout redirect
  const billingRef = useRef(billing);
  billingRef.current = billing;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      // Poll for tier update (webhook may take a moment)
      let attempts = 0;
      const poll = setInterval(async () => {
        await billingRef.current.refresh();
        attempts++;
        if (billingRef.current.tier === "professional" || attempts >= 10) {
          clearInterval(poll);
        }
      }, 2000);
      return () => clearInterval(poll);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (auth.loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #1A1611 0%, #0D0B09 40%, #14110E 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif", color: "#C4973B",
      }}>
        Loading...
      </div>
    );
  }

  if (!auth.user) {
    return <AuthScreen onLogin={auth.login} onRegister={auth.register} />;
  }

  const handleSend = (text: string) => {
    sendMessage(text);
    setInput("");
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    taskStore.addTask(newTask.trim(), newTaskPriority);
    setNewTask("");
  };

  const greeting = time.getHours() < 12 ? "Good Morning" : time.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const charsLeft = CONFIG.maxInputChars - input.length;

  const filteredProducts =
    productFilter === "all"
      ? PRODUCT_KB
      : productFilter === "hero"
        ? PRODUCT_KB.filter((p) => p.hero)
        : PRODUCT_KB.filter((p) => p.category.toLowerCase() === productFilter);

  const sortedTasks = [...taskStore.tasks].sort((a, b) => {
    const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (a.done !== b.done) return a.done ? 1 : -1;
    return p[a.priority] - p[b.priority];
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #1A1611 0%, #0D0B09 40%, #14110E 100%)",
        fontFamily: "'DM Sans', sans-serif",
        color: "#E8E0D4",
        display: "flex",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(196,151,59,0.2); border-radius: 4px; }
        input, textarea, select { font-family: 'DM Sans', sans-serif; }
        .sidebar { display: flex; }
        .sidebar-toggle { display: none; }
        .sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .sidebar { display: none; position: fixed; left: 0; top: 0; bottom: 0; z-index: 100; }
          .sidebar.open { display: flex; }
          .sidebar-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(196,151,59,0.2); background: rgba(196,151,59,0.08); color: #C4973B; font-size: 18px; cursor: pointer; }
          .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }
          .sidebar-overlay.open { display: block; }
          .main-content { padding: 16px !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div
        className={`sidebar${sidebarOpen ? " open" : ""}`}
        style={{
          width: 72,
          background: "rgba(0,0,0,0.95)",
          borderRight: "1px solid rgba(196,151,59,0.08)",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 24,
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #8B6914, #C4973B)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#1A1611", marginBottom: 20,
            fontFamily: "'Playfair Display', serif",
          }}
        >
          M
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
            title={tab.label}
            style={{
              width: 48, height: 48, borderRadius: 12, border: "none",
              background: activeTab === tab.id ? "rgba(196,151,59,0.15)" : "transparent",
              color: activeTab === tab.id ? "#C4973B" : "rgba(232,224,212,0.35)",
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, transition: "all 0.2s", position: "relative",
            }}
          >
            {activeTab === tab.id && (
              <div
                style={{
                  position: "absolute", left: -12, top: "50%",
                  transform: "translateY(-50%)",
                  width: 3, height: 20, borderRadius: 2, background: "#C4973B",
                }}
              />
            )}
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            padding: "20px 32px",
            borderBottom: "1px solid rgba(196,151,59,0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{"\u2630"}</button>
            <div>
            <div style={{ fontSize: 22, fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>{greeting}</div>
            <div style={{ fontSize: 12, color: "rgba(232,224,212,0.45)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
              {dateStr} · Marie AI
            </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: "rgba(232,224,212,0.5)" }}>{auth.user.name}</span>
            <button
              onClick={auth.logout}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid rgba(196,151,59,0.2)",
                background: "transparent",
                color: "rgba(232,224,212,0.5)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
          {!billing.loading && (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <PricingBanner
                tier={billing.tier}
                usage={billing.usage}
                onUpgrade={billing.upgrade}
                onManage={billing.manage}
              />
            </div>
          )}
          {/* Chat */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", maxWidth: 720, margin: "0 auto" }}>
              <div style={{ flex: 1, overflow: "auto", paddingBottom: 16 }}>
                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} />
                ))}
                {loading && (
                  <div style={{ display: "flex", gap: 6, padding: "14px 18px" }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#C4973B", opacity: 0.4, animation: `pulse 1s infinite ${i * 0.2}s` }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <QuickAction label="Draft buyer email" onClick={() => handleSend("Help me draft a professional follow-up email to a retail buyer about our Q2 performance and upcoming product launches.")} />
                  <QuickAction label="Meeting prep" onClick={() => handleSend("Help me prepare a structured agenda for a quarterly business review with a retail buyer team.")} />
                  <QuickAction label="Product FAQ" onClick={() => handleSend("Give me talking points for our top 3 hero SKUs — key differentiators, price points, and ideal customer profile.")} />
                  <QuickAction label="Daily briefing" onClick={() => handleSend("Give me a quick daily briefing: what should I prioritize today, and what follow-ups should I handle first?")} />
                </div>

                <div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value.slice(0, CONFIG.maxInputChars))}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input)}
                      placeholder="Ask Marie AI anything..."
                      disabled={loading}
                      style={{
                        flex: 1, padding: "14px 20px", borderRadius: 16,
                        border: `1px solid ${charsLeft < 100 ? "rgba(232,115,90,0.4)" : "rgba(196,151,59,0.2)"}`,
                        background: "rgba(255,255,255,0.04)", color: "#E8E0D4", fontSize: 14, outline: "none",
                      }}
                    />
                    <button
                      onClick={() => handleSend(input)}
                      disabled={loading || !input.trim()}
                      style={{
                        padding: "14px 24px", borderRadius: 16, border: "none",
                        background: loading || !input.trim() ? "rgba(196,151,59,0.2)" : "linear-gradient(135deg, #8B6914, #C4973B)",
                        color: "#1A1611", fontWeight: 700, fontSize: 14,
                        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                        letterSpacing: "0.02em", transition: "all 0.2s",
                      }}
                    >
                      Send
                    </button>
                  </div>
                  {charsLeft < 200 && (
                    <div style={{ textAlign: "right", fontSize: 11, marginTop: 6, color: charsLeft < 50 ? "#E8735A" : "rgba(232,224,212,0.35)" }}>
                      {charsLeft} chars remaining
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Emails */}
          {activeTab === "emails" && (
            <EmailsTab token={auth.token} connected={google.connected && billing.gmail} onConnect={billing.gmail ? google.connect : billing.upgrade} needsUpgrade={!billing.gmail} />
          )}

          {/* Calendar */}
          {activeTab === "calendar" && (
            <CalendarTab token={auth.token} connected={google.connected && billing.calendar} onConnect={billing.calendar ? google.connect : billing.upgrade} needsUpgrade={!billing.calendar} />
          )}

          {/* Products */}
          {activeTab === "products" && (
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600 }}>Product Reference</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["all", "hero", "face", "cheeks", "lips", "multi-use"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setProductFilter(f)}
                      style={{
                        padding: "6px 14px", borderRadius: 20,
                        border: productFilter === f ? "1px solid #C4973B" : "1px solid rgba(196,151,59,0.15)",
                        background: productFilter === f ? "rgba(196,151,59,0.15)" : "transparent",
                        color: productFilter === f ? "#C4973B" : "rgba(232,224,212,0.5)",
                        fontSize: 11, cursor: "pointer", textTransform: "capitalize",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, letterSpacing: "0.04em",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {filteredProducts.map((p, i) => (
                  <ProductCard key={i} product={p} />
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {activeTab === "tasks" && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Daily Tasks</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="Add a new task..."
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: 12,
                    border: "1px solid rgba(196,151,59,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#E8E0D4", fontSize: 14, outline: "none",
                  }}
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Task["priority"])}
                  style={{
                    padding: "12px 14px", borderRadius: 12,
                    border: "1px solid rgba(196,151,59,0.2)", background: "rgba(30,25,20,0.9)",
                    color: "#C4973B", fontSize: 12, outline: "none", cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600,
                  }}
                >
                  <option value="high">High</option>
                  <option value="medium">Med</option>
                  <option value="low">Low</option>
                </select>
                <button
                  onClick={addTask}
                  style={{
                    padding: "12px 20px", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #8B6914, #C4973B)",
                    color: "#1A1611", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ marginBottom: 12, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(232,224,212,0.35)", fontWeight: 600 }}>
                {taskStore.tasks.filter((t) => !t.done).length} remaining · {taskStore.tasks.filter((t) => t.done).length} complete
              </div>
              {sortedTasks.map((task) => (
                <TaskItem key={task.id} task={task} onToggle={() => taskStore.toggleTask(task.id)} onDelete={() => taskStore.deleteTask(task.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
