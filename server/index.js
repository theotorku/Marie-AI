import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { rateLimit } from "./rateLimit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { registerUser, loginUser, authenticateToken } from "./auth.js";
import { getDb } from "./db.js";
import {
  TIERS, getUserTier, checkUsageLimit, getDailyMessageCount,
  createCheckoutSession, createPortalSession, handleWebhook,
} from "./billing.js";
import {
  getAuthUrl, handleCallback, isConnected, disconnect,
  listEmails, getEmail, sendEmail, listEvents,
} from "./google.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — must come before express.json()
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    await handleWebhook(req.body, req.headers["stripe-signature"]);
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use(cors({
  origin: process.env.APP_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// ── Auth routes (public) ─────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  const result = await registerUser(email, password, name);
  if (result.error) return res.status(409).json(result);
  res.status(201).json(result);
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const result = await loginUser(email, password);
  if (result.error) return res.status(401).json(result);
  res.json(result);
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("id, email, name, tier")
    .eq("id", req.user.id)
    .single();
  if (!data) return res.status(404).json({ error: "User not found." });
  res.json({ user: data });
});

// ── Google OAuth (protected) ─────────────────────────────────────────────────

app.get("/api/google/status", authenticateToken, async (req, res) => {
  res.json({ connected: await isConnected(req.user.id) });
});

app.get("/api/google/auth-url", authenticateToken, (req, res) => {
  try {
    const url = getAuthUrl(req.user.id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/google/callback", async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) {
    return res.status(400).send("Missing code or state parameter.");
  }
  try {
    await handleCallback(code, userId);
    res.send(`
      <html><body style="background:#1A1611;color:#E8E0D4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center">
          <h2 style="color:#C4973B">Connected!</h2>
          <p>Google account linked. You can close this window.</p>
          <script>window.close();</script>
        </div>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send("Failed to connect Google account: " + err.message);
  }
});

app.post("/api/google/disconnect", authenticateToken, async (req, res) => {
  await disconnect(req.user.id);
  res.json({ ok: true });
});

// ── Billing routes (protected) ────────────────────────────────────────────────

app.get("/api/billing/tier", authenticateToken, async (req, res) => {
  const tier = await getUserTier(req.user.id);
  const usage = await checkUsageLimit(req.user.id, tier);
  res.json({ tier, ...TIERS[tier], usage });
});

app.post("/api/billing/checkout", authenticateToken, async (req, res) => {
  try {
    const url = await createCheckoutSession(req.user.id, req.user.email);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/billing/portal", authenticateToken, async (req, res) => {
  try {
    const url = await createPortalSession(req.user.id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Feature gate middleware ───────────────────────────────────────────────────

function requireTier(feature) {
  return async (req, res, next) => {
    const tier = await getUserTier(req.user.id);
    const config = TIERS[tier] || TIERS.free;
    if (!config[feature]) {
      return res.status(403).json({
        error: `${feature} requires a Professional plan. Upgrade to unlock this feature.`,
        upgrade: true,
      });
    }
    next();
  };
}

// ── Gmail routes (protected, Pro only) ───────────────────────────────────────

app.get("/api/gmail/messages", authenticateToken, requireTier("gmail"), async (req, res) => {
  try {
    const messages = await listEmails(req.user.id, Number(req.query.max) || 15);
    res.json({ messages });
  } catch (err) {
    res.status(err.message.includes("not connected") ? 403 : 502).json({ error: err.message });
  }
});

app.get("/api/gmail/messages/:id", authenticateToken, requireTier("gmail"), async (req, res) => {
  try {
    const message = await getEmail(req.user.id, req.params.id);
    res.json({ message });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/gmail/send", authenticateToken, requireTier("gmail"), async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "to, subject, and body are required." });
  }
  try {
    const result = await sendEmail(req.user.id, { to, subject, body });
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Calendar routes (protected) ──────────────────────────────────────────────

app.get("/api/calendar/events", authenticateToken, requireTier("calendar"), async (req, res) => {
  try {
    const events = await listEvents(req.user.id, Number(req.query.max) || 20);
    res.json({ events });
  } catch (err) {
    res.status(err.message.includes("not connected") ? 403 : 502).json({ error: err.message });
  }
});

// ── Tasks routes (protected) ─────────────────────────────────────────────────

app.get("/api/tasks", authenticateToken, async (req, res) => {
  const db = getDb();
  const { data, error } = await db
    .from("tasks")
    .select("id, text, priority, done, created_at")
    .eq("user_id", req.user.id)
    .order("created_at");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tasks: data });
});

app.post("/api/tasks", authenticateToken, async (req, res) => {
  const { text, priority } = req.body;
  if (!text) return res.status(400).json({ error: "text is required." });
  const db = getDb();

  // Enforce task cap for free tier
  const tier = await getUserTier(req.user.id);
  const config = TIERS[tier] || TIERS.free;
  if (config.maxTasks !== null) {
    const { count } = await db
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id);
    if ((count || 0) >= config.maxTasks) {
      return res.status(403).json({
        error: `Free plan limited to ${config.maxTasks} tasks. Upgrade to Professional for unlimited tasks.`,
        upgrade: true,
      });
    }
  }

  const { data, error } = await db
    .from("tasks")
    .insert({ user_id: req.user.id, text, priority: priority || "medium" })
    .select("id, text, priority, done, created_at")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ task: data });
});

app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
  const db = getDb();
  const { data, error } = await db
    .from("tasks")
    .update(req.body)
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select("id, text, priority, done, created_at")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "Task not found." });
  res.json({ task: data });
});

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  const db = getDb();
  const { error } = await db
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Messages routes (protected) ──────────────────────────────────────────────

app.get("/api/messages", authenticateToken, async (req, res) => {
  const db = getDb();
  const tier = await getUserTier(req.user.id);
  const config = TIERS[tier] || TIERS.free;

  let query = db
    .from("messages")
    .select("id, role, content, created_at")
    .eq("user_id", req.user.id)
    .order("created_at")
    .limit(50);

  // Free tier: only last 7 days
  if (config.chatHistoryDays !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.chatHistoryDays);
    query = query.gte("created_at", cutoff.toISOString());
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages: data });
});

app.post("/api/messages", authenticateToken, async (req, res) => {
  const { role, content } = req.body;
  if (!role || !content) return res.status(400).json({ error: "role and content are required." });
  const db = getDb();
  const { data, error } = await db
    .from("messages")
    .insert({ user_id: req.user.id, role, content })
    .select("id, role, content, created_at")
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: data });
});

// ── Chat route (protected, tier-aware) ────────────────────────────────────────

app.post("/api/chat", authenticateToken, async (req, res) => {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "CLAUDE_API_KEY not configured on server." });
  }

  // Enforce tier limits
  const tier = await getUserTier(req.user.id);
  const config = TIERS[tier] || TIERS.free;
  const usage = await checkUsageLimit(req.user.id, tier);

  if (!usage.allowed) {
    return res.status(429).json({
      error: `Daily message limit reached (${usage.limit}/day). ${tier === "free" ? "Upgrade to Professional for 100 messages/day." : "Limit resets at midnight."}`,
      upgrade: tier === "free",
      usage,
    });
  }

  // Apply tier-specific rate limit
  const limiter = rateLimit({ windowMs: 60_000, maxRequests: config.rateLimit });
  limiter(req, res, async () => {
    try {
      // Override model and max_tokens based on tier
      const body = {
        ...req.body,
        model: config.model,
        max_tokens: Math.min(req.body.max_tokens || config.maxOutputTokens, config.maxOutputTokens),
      };

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Include usage info in response headers
      res.set("X-Usage-Remaining", String(usage.remaining - 1));
      res.set("X-Usage-Limit", String(usage.limit));

      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: "Failed to reach Anthropic API." });
    }
  });
});

// ── Static files (production) ─────────────────────────────────────────────────

const distPath = join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Marie AI proxy server running on http://localhost:${PORT}`);
});
