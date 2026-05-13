import {
  scopeToUser,
  scopeToOwnedRecord,
  sendJsonError,
  sendListResponse,
  sendRecordResponse,
  sendOkResponse,
} from "./routeHelpers.js";

export function registerCrmRoutes(app, { authenticateToken, requireTier, getDb }) {
  const crmWriteMiddleware = [authenticateToken, requireTier("proactiveAgent")];

  app.get("/api/contacts", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToUser(
      db
      .from("contacts")
      .select("*"),
      req.user.id
    ).order("updated_at", { ascending: false });
    return sendListResponse(res, result, "contacts");
  });

  app.post("/api/contacts", ...crmWriteMiddleware, async (req, res) => {
    const { name, company, role, email, phone, stage, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required." });
    const db = getDb();
    const result = await db
      .from("contacts")
      .insert({ user_id: req.user.id, name, company, role, email, phone, stage: stage || "lead", notes })
      .select()
      .single();
    return sendRecordResponse(res, result, "contact", { status: 201 });
  });

  app.patch("/api/contacts/:id", ...crmWriteMiddleware, async (req, res) => {
    const db = getDb();
    const result = await scopeToOwnedRecord(
      db
      .from("contacts")
      .update({ ...req.body, updated_at: new Date().toISOString() }),
      req.params.id,
      req.user.id
    )
      .select()
      .single();
    return sendRecordResponse(res, result, "contact", { notFoundMessage: "Contact not found." });
  });

  app.delete("/api/contacts/:id", ...crmWriteMiddleware, async (req, res) => {
    const db = getDb();
    const { error } = await scopeToOwnedRecord(
      db
      .from("contacts")
      .delete(),
      req.params.id,
      req.user.id
    );
    return sendOkResponse(res, error);
  });

  app.get("/api/contacts/:id/interactions", authenticateToken, async (req, res) => {
    const db = getDb();
    const result = await scopeToUser(
      db
      .from("interactions")
      .select("*")
      .eq("contact_id", req.params.id),
      req.user.id
    )
      .order("created_at", { ascending: false })
      .limit(50);
    return sendListResponse(res, result, "interactions");
  });

  app.post("/api/contacts/:id/interactions", ...crmWriteMiddleware, async (req, res) => {
    const { type, summary } = req.body;
    if (!type || !summary) return res.status(400).json({ error: "type and summary are required." });
    const db = getDb();

    const { data: contact, error: contactError } = await scopeToOwnedRecord(
      db
      .from("contacts")
      .select("id"),
      req.params.id,
      req.user.id
    )
      .single();
    if (contactError) return sendJsonError(res, 500, contactError);
    if (!contact) return res.status(404).json({ error: "Contact not found." });

    const result = await db
      .from("interactions")
      .insert({ contact_id: req.params.id, user_id: req.user.id, type, summary })
      .select()
      .single();
    if (result.error) return sendJsonError(res, 500, result.error);

    const now = new Date().toISOString();
    const { error: updateError } = await scopeToOwnedRecord(
      db.from("contacts").update({ last_contacted_at: now, updated_at: now }),
      req.params.id,
      req.user.id
    );
    if (updateError) return sendJsonError(res, 500, updateError);

    return res.status(201).json({ interaction: result.data });
  });
}
