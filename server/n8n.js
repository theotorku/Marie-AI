import { getDb } from "./db.js";

// ── Connection management ─────────────────────────────────────────────────────

export async function saveConnection(userId, webhookUrl) {
  const db = getDb();
  const url = webhookUrl.replace(/\/+$/, ""); // strip trailing slash
  await db.from("n8n_connections").upsert({
    user_id: userId,
    webhook_url: url,
    updated_at: new Date().toISOString(),
  });
}

export async function getConnection(userId) {
  const db = getDb();
  const { data } = await db
    .from("n8n_connections")
    .select("webhook_url")
    .eq("user_id", userId)
    .single();
  return data?.webhook_url || null;
}

export async function isConnected(userId) {
  return (await getConnection(userId)) !== null;
}

export async function disconnect(userId) {
  const db = getDb();
  await db.from("n8n_connections").delete().eq("user_id", userId);
}

// ── n8n webhook caller ────────────────────────────────────────────────────────

async function callN8n(webhookUrl, path, options = {}) {
  const { method = "POST", body = {} } = options;
  const url = `${webhookUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`n8n webhook error (${res.status}): ${text}`);
  }

  return res.json();
}

async function getWebhookUrl(userId) {
  const url = await getConnection(userId);
  if (!url) throw new Error("n8n not connected. Configure your webhook URL in Settings.");
  return url;
}

// ── Gmail via n8n ─────────────────────────────────────────────────────────────

export async function listEmails(userId, maxResults = 15) {
  const url = await getWebhookUrl(userId);
  const data = await callN8n(url, "/list-emails", {
    body: { maxResults },
  });
  return Array.isArray(data) ? data : data.emails || [];
}

export async function getEmail(userId, messageId) {
  const url = await getWebhookUrl(userId);
  return callN8n(url, "/get-email", {
    body: { messageId },
  });
}

export async function sendEmail(userId, { to, subject, body }) {
  const url = await getWebhookUrl(userId);
  return callN8n(url, "/send-email", {
    body: { to, subject, body },
  });
}

export async function listSentEmails(userId, maxResults = 10, afterDate = null) {
  const url = await getWebhookUrl(userId);
  const data = await callN8n(url, "/list-sent-emails", {
    body: { maxResults, afterDate },
  });
  return Array.isArray(data) ? data : data.emails || [];
}

export async function getThreadMessageCount(userId, threadId) {
  const url = await getWebhookUrl(userId);
  const data = await callN8n(url, "/thread-count", {
    body: { threadId },
  });
  return typeof data === "number" ? data : data.count || 0;
}

// ── Calendar via n8n ──────────────────────────────────────────────────────────

export async function listEvents(userId, maxResults = 20) {
  const url = await getWebhookUrl(userId);
  const data = await callN8n(url, "/list-events", {
    body: { maxResults },
  });
  return Array.isArray(data) ? data : data.events || [];
}

export async function listUpcomingEvents(userId, hoursAhead = 24) {
  const url = await getWebhookUrl(userId);
  const data = await callN8n(url, "/upcoming-events", {
    body: { hoursAhead },
  });
  return Array.isArray(data) ? data : data.events || [];
}
