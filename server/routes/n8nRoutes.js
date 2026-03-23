import { sendJsonError } from "./routeHelpers.js";

export function registerN8nRoutes(app, deps) {
  const {
    authenticateToken,
    requireTier,
    isConnected,
    disconnect,
    saveConnection,
    listEmails,
    getEmail,
    sendEmail,
    listEvents,
  } = deps;

  // ── Connection management ─────────────────────────────────────────────────

  app.get("/api/n8n/status", authenticateToken, async (req, res) => {
    try {
      const connected = await isConnected(req.user.id);
      res.json({ connected });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  app.post("/api/n8n/connect", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl || typeof webhookUrl !== "string") {
        return res.status(400).json({ error: "webhookUrl is required" });
      }
      // Basic URL validation
      try { new URL(webhookUrl); } catch {
        return res.status(400).json({ error: "Invalid webhook URL" });
      }
      await saveConnection(req.user.id, webhookUrl);
      res.json({ ok: true });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  app.post("/api/n8n/disconnect", authenticateToken, async (req, res) => {
    try {
      await disconnect(req.user.id);
      res.json({ ok: true });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  // ── Gmail via n8n ───────────────────────────────────────────────────────────

  app.get("/api/gmail/messages", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const emails = await listEmails(req.user.id);
      res.json({ emails });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  app.get("/api/gmail/messages/:id", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const email = await getEmail(req.user.id, req.params.id);
      res.json({ email });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  app.post("/api/gmail/send", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject) {
        return res.status(400).json({ error: "to and subject are required" });
      }
      const result = await sendEmail(req.user.id, { to, subject, body });
      res.json(result);
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });

  // ── Calendar via n8n ────────────────────────────────────────────────────────

  app.get("/api/calendar/events", authenticateToken, requireTier("calendar"), async (req, res) => {
    try {
      const events = await listEvents(req.user.id);
      res.json({ events });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });
}
