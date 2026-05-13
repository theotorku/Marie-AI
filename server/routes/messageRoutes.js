export function registerMessageRoutes(app, deps) {
  const {
    authenticateToken,
    getDb,
    getUserTier,
    checkUsageLimit,
    TIERS,
    chatRateLimiters,
  } = deps;

  function getLatestUserMessage(messages) {
    if (!Array.isArray(messages)) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role === "user" && typeof message.content === "string" && message.content.trim()) {
        return message.content.trim();
      }
    }
    return null;
  }

  app.get("/api/messages", authenticateToken, async (req, res) => {
    const db = getDb();
    const tier = await getUserTier(req.user.id);
    const config = TIERS[tier] || TIERS.free;

    let query = db
      .from("messages")
      .select("id, role, content, created_at")
      .eq("user_id", req.user.id)
      .order("created_at")
      .limit(50);

    if (config.chatHistoryDays !== null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - config.chatHistoryDays);
      query = query.gte("created_at", cutoff.toISOString());
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ messages: data });
  });

  app.post("/api/messages", authenticateToken, async (req, res) => {
    const { role, content } = req.body;
    if (!role || !content) return res.status(400).json({ error: "role and content are required." });
    if (!["user", "assistant"].includes(role)) {
      return res.status(400).json({ error: "role must be user or assistant." });
    }
    const db = getDb();
    const { data, error } = await db
      .from("messages")
      .insert({ user_id: req.user.id, role, content })
      .select("id, role, content, created_at")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ message: data });
  });

  app.post("/api/chat", authenticateToken, async (req, res) => {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "CLAUDE_API_KEY not configured on server." });
    }

    const tier = await getUserTier(req.user.id);
    const config = TIERS[tier] || TIERS.free;
    const usage = await checkUsageLimit(req.user.id, tier);
    const userContent = getLatestUserMessage(req.body.messages);

    if (!userContent) {
      return res.status(400).json({ error: "A user message is required." });
    }

    if (!usage.allowed) {
      return res.status(429).json({
        error: `Daily message limit reached (${usage.limit}/day). ${tier === "free" ? "Upgrade to Professional for 100 messages/day." : "Limit resets at midnight."}`,
        upgrade: tier === "free",
        usage,
      });
    }

    const limiter = chatRateLimiters[tier] || chatRateLimiters.free;
    limiter(req, res, async () => {
      try {
        const db = getDb();
        const { error: userMessageError } = await db
          .from("messages")
          .insert({ user_id: req.user.id, role: "user", content: userContent });

        if (userMessageError) {
          return res.status(500).json({ error: userMessageError.message });
        }

        const body = {
          ...req.body,
          model: config.model,
          max_tokens: Math.min(req.body.max_tokens || config.maxOutputTokens, config.maxOutputTokens),
        };

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        res.set("X-Usage-Remaining", String(usage.remaining - 1));
        res.set("X-Usage-Limit", String(usage.limit));

        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        const assistantContent =
          data.content?.map((block) => block?.text || "").join("\n").trim();
        if (assistantContent) {
          await db
            .from("messages")
            .insert({ user_id: req.user.id, role: "assistant", content: assistantContent });
        }

        res.json(data);
      } catch (err) {
        res.status(502).json({ error: "Failed to reach Anthropic API." });
      }
    });
  });
}
