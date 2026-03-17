export function registerCrmRoutes(app, { authenticateToken, requireTier, getDb }) {
  app.get("/api/contacts", authenticateToken, requireTier("proactiveAgent"), async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("contacts")
      .select("*")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ contacts: data });
  });

  app.post("/api/contacts", authenticateToken, requireTier("proactiveAgent"), async (req, res) => {
    const { name, company, role, email, phone, stage, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required." });
    const db = getDb();
    const { data, error } = await db
      .from("contacts")
      .insert({ user_id: req.user.id, name, company, role, email, phone, stage: stage || "lead", notes })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ contact: data });
  });

  app.patch("/api/contacts/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("contacts")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Contact not found." });
    res.json({ contact: data });
  });

  app.delete("/api/contacts/:id", authenticateToken, async (req, res) => {
    const db = getDb();
    const { error } = await db
      .from("contacts")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });

  app.get("/api/contacts/:id/interactions", authenticateToken, async (req, res) => {
    const db = getDb();
    const { data, error } = await db
      .from("interactions")
      .select("*")
      .eq("contact_id", req.params.id)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ interactions: data });
  });

  app.post("/api/contacts/:id/interactions", authenticateToken, async (req, res) => {
    const { type, summary } = req.body;
    if (!type || !summary) return res.status(400).json({ error: "type and summary are required." });
    const db = getDb();

    const { data, error } = await db
      .from("interactions")
      .insert({ contact_id: req.params.id, user_id: req.user.id, type, summary })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    await db.from("contacts")
      .update({ last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    res.status(201).json({ interaction: data });
  });
}