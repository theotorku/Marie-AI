import {
  scopeToUser,
  scopeToOwnedRecord,
  sendListResponse,
  sendRecordResponse,
  sendOkResponse,
} from "./routeHelpers.js";

export function registerTemplateRoutes(app, { authenticateToken, requireTier, getDb }) {
  const templateWriteMiddleware = [authenticateToken, requireTier("gmail")];

  app.get("/api/templates", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToUser(
      db
      .from("email_templates")
      .select("id, name, category, subject, body, created_at, updated_at"),
      req.user.id
    ).order("updated_at", { ascending: false });
    return sendListResponse(res, result, "templates");
  });

  app.post("/api/templates", ...templateWriteMiddleware, async (req, res) => {
    const { name, category, subject, body } = req.body;
    if (!name || !body) return res.status(400).json({ error: "name and body are required." });
    const db = getDb();
    const result = await db
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
    return sendRecordResponse(res, result, "template", { status: 201 });
  });

  app.patch("/api/templates/:id", ...templateWriteMiddleware, async (req, res) => {
    const db = getDb();
    const result = await scopeToOwnedRecord(
      db
      .from("email_templates")
      .update({ ...req.body, updated_at: new Date().toISOString() }),
      req.params.id,
      req.user.id
    )
      .select("id, name, category, subject, body, created_at, updated_at")
      .single();
    return sendRecordResponse(res, result, "template", { notFoundMessage: "Template not found." });
  });

  app.delete("/api/templates/:id", ...templateWriteMiddleware, async (req, res) => {
    const db = getDb();
    const { error } = await scopeToOwnedRecord(
      db
      .from("email_templates")
      .delete(),
      req.params.id,
      req.user.id
    );
    return sendOkResponse(res, error);
  });
}
