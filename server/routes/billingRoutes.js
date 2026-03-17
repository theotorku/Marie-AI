import { sendJsonError } from "./routeHelpers.js";

export function registerBillingRoutes(app, deps) {
  const {
    authenticateToken,
    getUserTier,
    checkUsageLimit,
    createCheckoutSession,
    createPortalSession,
    TIERS,
  } = deps;

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
      sendJsonError(res, 500, err);
    }
  });

  app.post("/api/billing/portal", authenticateToken, async (req, res) => {
    try {
      const url = await createPortalSession(req.user.id);
      res.json({ url });
    } catch (err) {
      sendJsonError(res, 500, err);
    }
  });
}