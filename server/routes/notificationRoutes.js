export function registerNotificationRoutes(app, { authenticateToken, getDb }) {
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("notifications")
      .select("id, type, title, content, read, metadata, created_at")
      .eq("user_id", req.user.id)
      .in("channel", ["web", "both"])
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ notifications: data });
  });

  app.get("/api/notifications/unread-count", authenticateToken, async (req, res) => {
    const db = getDb();
    const { count, error } = await db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .eq("read", false)
      .in("channel", ["web", "both"]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ count: count || 0 });
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", req.user.id)
      .eq("read", false);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });
}