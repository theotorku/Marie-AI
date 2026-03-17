import { registerOAuthConnectRoutes, sendJsonError } from "./routeHelpers.js";

export function registerGoogleRoutes(app, deps) {
  const {
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
  } = deps;

  registerOAuthConnectRoutes(app, {
    provider: "google",
    authPath: "/api/google/auth-url",
    callbackPath: "/api/google/callback",
    authMiddlewares: [authenticateToken],
    createOAuthState,
    createOAuthStateCookie,
    clearOAuthStateCookie,
    consumeOAuthState,
    getAuthUrl,
    handleCallback,
    successTitle: "Connected!",
    successMessage: "Google account linked. You can close this window.",
    failureMessage: "Failed to connect Google account",
  });

  app.get("/api/google/status", authenticateToken, async (req, res) => {
    res.json({ connected: await isConnected(req.user.id) });
  });

  app.post("/api/google/disconnect", authenticateToken, async (req, res) => {
    await disconnect(req.user.id);
    res.json({ ok: true });
  });

  app.get("/api/gmail/messages", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const messages = await listEmails(req.user.id, Number(req.query.max) || 15);
      res.json({ messages });
    } catch (err) {
      sendJsonError(res, String(err?.message || err).includes("not connected") ? 403 : 502, err);
    }
  });

  app.get("/api/gmail/messages/:id", authenticateToken, requireTier("gmail"), async (req, res) => {
    try {
      const message = await getEmail(req.user.id, req.params.id);
      res.json({ message });
    } catch (err) {
      sendJsonError(res, 502, err);
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
      sendJsonError(res, 502, err);
    }
  });

  app.get("/api/calendar/events", authenticateToken, requireTier("calendar"), async (req, res) => {
    try {
      const events = await listEvents(req.user.id, Number(req.query.max) || 20);
      res.json({ events });
    } catch (err) {
      sendJsonError(res, String(err?.message || err).includes("not connected") ? 403 : 502, err);
    }
  });
}