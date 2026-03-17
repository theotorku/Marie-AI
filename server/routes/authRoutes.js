export function registerAuthRoutes(app, { authenticateToken, registerUser, loginUser, getDb }) {
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    const result = await registerUser(email, password, name);
    if (result.error) return res.status(409).json(result);
    res.status(201).json(result);
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const result = await loginUser(email, password);
    if (result.error) return res.status(401).json(result);
    res.json(result);
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    const db = getDb();
    const { data } = await db
      .from("users")
      .select("id, email, name, tier, onboarding_completed")
      .eq("id", req.user.id)
      .single();
    if (!data) return res.status(404).json({ error: "User not found." });
    res.json({ user: data });
  });

  app.post("/api/auth/onboarding-complete", authenticateToken, async (req, res) => {
    const db = getDb();
    await db.from("users").update({ onboarding_completed: true }).eq("id", req.user.id);
    res.json({ ok: true });
  });
}