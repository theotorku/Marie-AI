import { sendJsonError } from "./routeHelpers.js";

export function registerAgentRoutes(app, deps) {
  const {
    authenticateToken,
    requireTier,
    generateDailyBriefing,
    detectFollowUpNudges,
    prepareMeetingBriefing,
    checkRestockAlerts,
  } = deps;

  const proAgentMiddleware = [authenticateToken, requireTier("proactiveAgent")];
  const routes = [
    { path: "/api/agent/briefing", action: generateDailyBriefing, responseKey: "notification" },
    { path: "/api/agent/nudges", action: detectFollowUpNudges, responseKey: "notifications" },
    { path: "/api/agent/meeting-prep", action: prepareMeetingBriefing, responseKey: "notifications" },
    { path: "/api/agent/restock", action: checkRestockAlerts, responseKey: "notification" },
  ];

  for (const { path, action, responseKey } of routes) {
    app.post(path, ...proAgentMiddleware, async (req, res) => {
      try {
        const result = await action(req.user.id);
        res.json({ [responseKey]: result });
      } catch (err) {
        sendJsonError(res, 500, err);
      }
    });
  }
}