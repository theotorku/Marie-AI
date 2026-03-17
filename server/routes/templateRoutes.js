export function registerTemplateRoutes(app, { authenticateToken, requireTier, getDb }) {
  app.get("/api/templates", authenticateToken, requireTier("gmail"), async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("email_templates")
      .select("id, name, category, subject, body, created_at, updated_at")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ templates: data });
  });

  app.post("/api/templates", authenticateToken, requireTier("gmail"), async (req, res) => {
    const { name, category, subject, body } = req.body;
    if (!name || !body) return res.status(400).json({ error: "name and body are required." });
    const db = getDb();
    const { data, error } = await db
      .from("email_templates")
      .insert({
        user_id: req.user.id,
        name,
        category: category || "general",
        subject: subject || "",
        body,
      })
      .select("id, name, category, subject, body, created_at, updated_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ template: data });
  });

  app.patch("/api/templates/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("email_templates")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select("id, name, category, subject, body, created_at, updated_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Template not found." });
    res.json({ template: data });
  });

  app.delete("/api/templates/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await db
      .from("email_templates")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });
}