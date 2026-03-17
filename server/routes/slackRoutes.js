import { registerOAuthConnectRoutes } from "./routeHelpers.js";

export function registerSlackRoutes(app, deps) {
  const {
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
  } = deps;

  registerOAuthConnectRoutes(app, {
    provider: "slack",
    authPath: "/api/slack/auth-url",
    callbackPath: "/api/slack/callback",
    authMiddlewares: [authenticateToken, requireTier("slack")],
    createOAuthState,
    createOAuthStateCookie,
    clearOAuthStateCookie,
    consumeOAuthState,
    getAuthUrl: getSlackAuthUrl,
    handleCallback: handleSlackCallback,
    successTitle: "Slack Connected!",
    successMessage: "Your Slack workspace is now linked to Marie AI. You can close this window.",
    failureMessage: "Failed to connect Slack",
  });

  app.get("/api/slack/status", authenticateToken, async (req, res) => {
    const conn = await getSlackConnection(req.user.id);
    res.json({
      connected: !!conn,
      teamName: conn?.slack_team_name || null,
    });
  });

  app.post("/api/slack/disconnect", authenticateToken, async (req, res) => {
    await disconnectSlack(req.user.id);
    res.json({ ok: true });
  });
}