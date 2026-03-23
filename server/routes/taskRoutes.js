import {
  scopeToUser,
  scopeToOwnedRecord,
  sendListResponse,
  sendRecordResponse,
  sendOkResponse,
} from "./routeHelpers.js";

export function registerTaskRoutes(app, { authenticateToken, getDb, getUserTier, TIERS }) {
  app.get("/api/tasks", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToUser(
      db
      .from("tasks")
      .select("id, text, priority, done, created_at"),
      req.user.id
    ).order("created_at");
    return sendListResponse(res, result, "tasks");
  });

  app.post("/api/tasks", authenticateToken, async (req, res) => {
    const { text, priority } = req.body;
    if (!text) return res.status(400).json({ error: "text is required." });
    const db = getDb();

    const tier = await getUserTier(req.user.id);
    const config = TIERS[tier] || TIERS.free;
    if (config.maxTasks !== null) {
      const { count } = await scopeToUser(
        db
        .from("tasks")
        .select("*", { count: "exact", head: true }),
        req.user.id
      );
      if ((count || 0) >= config.maxTasks) {
        return res.status(403).json({
          error: `Free plan limited to ${config.maxTasks} tasks. Upgrade to Professional for unlimited tasks.`,
          upgrade: true,
        });
      }
    }

    const result = await db
      .from("tasks")
      .insert({ user_id: req.user.id, text, priority: priority || "medium" })
      .select("id, text, priority, done, created_at")
      .single();
    return sendRecordResponse(res, result, "task", { status: 201 });
  });

  app.patch("/api/tasks/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToOwnedRecord(
      db
      .from("tasks")
      .update(req.body),
      req.params.id,
      req.user.id
    )
      .select("id, text, priority, done, created_at")
      .single();
    return sendRecordResponse(res, result, "task", { notFoundMessage: "Task not found." });
  });

  app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await scopeToOwnedRecord(
      db
      .from("tasks")
      .delete(),
      req.params.id,
      req.user.id
    );
    return sendOkResponse(res, error);
  });
}