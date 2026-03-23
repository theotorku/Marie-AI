import {
  scopeToUser,
  scopeToOwnedRecord,
  sendJsonError,
  sendListResponse,
  sendOkResponse,
} from "./routeHelpers.js";

export function registerNotificationRoutes(app, { authenticateToken, getDb }) {
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToUser(
      db
      .from("notifications")
      .select("id, type, title, content, read, metadata, created_at")
      .in("channel", ["web", "both"]),
      req.user.id
    )
      .order("created_at", { ascending: false })
      .limit(30);
    return sendListResponse(res, result, "notifications");
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req, res) => {
    const db = getDb();
    const { count, error } = await scopeToUser(
      db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false)
      .in("channel", ["web", "both"]),
      req.user.id
    );
    if (error) return sendJsonError(res, 500, error);
    res.json({ count: count || 0 });
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await scopeToOwnedRecord(
      db
      .from("notifications")
      .update({ read: true }),
      req.params.id,
      req.user.id
    );
    return sendOkResponse(res, error);
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await scopeToUser(
      db
      .from("notifications")
      .update({ read: true })
      .eq("read", false),
      req.user.id
    );
    return sendOkResponse(res, error);
  });
}