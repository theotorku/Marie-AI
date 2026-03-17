import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { rateLimit } from "./rateLimit.js";
import { registerAuthRoutes } from "./routes/authRoutes.js";
import { registerGoogleRoutes } from "./routes/googleRoutes.js";
import { registerBillingRoutes } from "./routes/billingRoutes.js";
import { registerTaskRoutes } from "./routes/taskRoutes.js";
import { registerMessageRoutes } from "./routes/messageRoutes.js";
import { registerSlackRoutes } from "./routes/slackRoutes.js";
import { registerCrmRoutes } from "./routes/crmRoutes.js";
import { registerAnalyticsRoutes } from "./routes/analyticsRoutes.js";
import { registerTemplateRoutes } from "./routes/templateRoutes.js";
import { registerNotificationRoutes } from "./routes/notificationRoutes.js";
import { registerAgentRoutes } from "./routes/agentRoutes.js";

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
import {
  generateDailyBriefing, detectFollowUpNudges,
  prepareMeetingBriefing, checkRestockAlerts,
} from "./agent.js";
import {
  verifySlackRequest, getSlackAuthUrl, handleSlackCallback,
  getSlackConnection, disconnectSlack, handleSlashCommand, handleSlackEvent,
} from "./slack.js";
import {
  createOAuthState,
  createOAuthStateCookie,
  clearOAuthStateCookie,
  consumeOAuthState,
} from "./oauthState.js";

const PORT = process.env.PORT || 3001;

export function createApp() {
  const app = express();
  const chatRateLimiters = Object.fromEntries(
    Object.entries(TIERS).map(([tier, config]) => [
      tier,
      rateLimit({ windowMs: 60_000, maxRequests: config.rateLimit }),
    ])
  );

// Stripe webhook needs raw body — must come before express.json()
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    await handleWebhook(req.body, req.headers["stripe-signature"]);
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Slack endpoints need raw body for signature verification
app.post("/api/slack/command", express.urlencoded({ extended: true, verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }), async (req, res) => {
  try {
    if (process.env.SLACK_SIGNING_SECRET && !verifySlackRequest(req)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    const response = await handleSlashCommand(req.body);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/slack/events", express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString(); } }), async (req, res) => {
  try {
    if (process.env.SLACK_SIGNING_SECRET && !verifySlackRequest(req)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
    const response = await handleSlackEvent(req.body);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(cors({
  origin: process.env.APP_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

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

// ── Auth routes (public) ─────────────────────────────────────────────────────

registerAuthRoutes(app, {
  authenticateToken,
  registerUser,
  loginUser,
  getDb,
});

// ── Google routes (OAuth, Gmail, Calendar) ───────────────────────────────────

registerGoogleRoutes(app, {
  authenticateToken,
  requireTier,
  createOAuthState,
  createOAuthStateCookie,
  clearOAuthStateCookie,
  consumeOAuthState,
  getAuthUrl,
  handleCallback,
  isConnected,
  disconnect,
  listEmails,
  getEmail,
  sendEmail,
  listEvents,
});

// ── Billing routes (protected) ────────────────────────────────────────────────

registerBillingRoutes(app, {
  authenticateToken,
  getUserTier,
  checkUsageLimit,
  createCheckoutSession,
  createPortalSession,
  TIERS,
});

// ── Tasks routes (protected) ─────────────────────────────────────────────────

registerTaskRoutes(app, {
  authenticateToken,
  getDb,
  getUserTier,
  TIERS,
});

// ── Messages and chat routes (protected, tier-aware) ─────────────────────────

registerMessageRoutes(app, {
  authenticateToken,
  getDb,
  getUserTier,
  checkUsageLimit,
  TIERS,
  chatRateLimiters,
});

// ── Slack routes (protected, Pro only) ────────────────────────────────────────

registerSlackRoutes(app, {
  authenticateToken,
  requireTier,
  createOAuthState,
  createOAuthStateCookie,
  clearOAuthStateCookie,
  consumeOAuthState,
  getSlackAuthUrl,
  handleSlackCallback,
  getSlackConnection,
  disconnectSlack,
});

// ── CRM routes (protected, Pro only) ──────────────────────────────────────────

registerCrmRoutes(app, {
  authenticateToken,
  requireTier,
  getDb,
});

// ── Analytics route (protected, Pro only) ─────────────────────────────────────

registerAnalyticsRoutes(app, {
  authenticateToken,
  requireTier,
  getDb,
});

// ── Email templates routes (protected, Pro only) ─────────────────────────────

registerTemplateRoutes(app, {
  authenticateToken,
  requireTier,
  getDb,
});

// ── Notifications routes (protected) ──────────────────────────────────────────

registerNotificationRoutes(app, {
  authenticateToken,
  getDb,
});

// ── Agent routes (protected, Pro only) ────────────────────────────────────────

registerAgentRoutes(app, {
  authenticateToken,
  requireTier,
  generateDailyBriefing,
  detectFollowUpNudges,
  prepareMeetingBriefing,
  checkRestockAlerts,
});

// ── Static files (production) ─────────────────────────────────────────────────

const distPath = join(__dirname, "../dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

return app;
}

export function startServer(port = PORT) {
  const app = createApp();

  return app.listen(port, () => {
    console.log(`Marie AI proxy server running on http://localhost:${port}`);
    // Start the scheduler in-process
    import("./scheduler.js").catch((err) =>
      console.error("[scheduler] Failed to start:", err.message)
    );
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
