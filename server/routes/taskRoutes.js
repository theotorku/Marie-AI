export function registerTaskRoutes(app, { authenticateToken, getDb, getUserTier, TIERS }) {
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
}