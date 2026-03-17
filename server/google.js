import { google } from "googleapis";
import { getDb } from "./db.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function loadTokens(userId) {
  const db = getDb();
  const { data } = await db
    .from("google_tokens")
    .select("tokens")
    .eq("user_id", userId)
    .single();
  return data?.tokens || null;
}

async function saveTokens(userId, tokens) {
  const db = getDb();
  await db
    .from("google_tokens")
    .upsert({ user_id: userId, tokens, updated_at: new Date().toISOString() });
}

export function getAuthUrl(state) {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function handleCallback(code, userId) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  await saveTokens(userId, tokens);
  return tokens;
}

export async function getAuthenticatedClient(userId) {
  const tokens = await loadTokens(userId);
  if (!tokens) return null;

  const client = getOAuth2Client();
  client.setCredentials(tokens);

  client.on("tokens", async (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    await saveTokens(userId, merged);
  });

  return client;
}

export async function isConnected(userId) {
  return (await loadTokens(userId)) !== null;
}

export async function disconnect(userId) {
  const db = getDb();
  await db.from("google_tokens").delete().eq("user_id", userId);
}

// ── Gmail ────────────────────────────────────────────────────────────────────

export async function listEmails(userId, maxResults = 15) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const gmail = google.gmail({ version: "v1", auth });
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
  });

  if (!list.data.messages) return [];

  const messages = await Promise.all(
    list.data.messages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = full.data.payload?.headers || [];
      const get = (name) => headers.find((h) => h.name === name)?.value || "";
      return {
        id: msg.id,
        from: get("From"),
        subject: get("Subject"),
        date: get("Date"),
        snippet: full.data.snippet || "",
        unread: (full.data.labelIds || []).includes("UNREAD"),
      };
    })
  );

  return messages;
}

export async function getEmail(userId, messageId) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const gmail = google.gmail({ version: "v1", auth });
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const headers = msg.data.payload?.headers || [];
  const get = (name) => headers.find((h) => h.name === name)?.value || "";

  let body = "";
  const parts = msg.data.payload?.parts || [];
  if (parts.length > 0) {
    const textPart = parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }
  } else if (msg.data.payload?.body?.data) {
    body = Buffer.from(msg.data.payload.body.data, "base64").toString("utf-8");
  }

  return {
    id: msg.data.id,
    threadId: msg.data.threadId,
    from: get("From"),
    to: get("To"),
    subject: get("Subject"),
    date: get("Date"),
    body,
    snippet: msg.data.snippet || "",
  };
}

export async function sendEmail(userId, { to, subject, body }) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const gmail = google.gmail({ version: "v1", auth });

  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
  ).toString("base64url");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { id: result.data.id };
}

// ── Gmail: Sent mail & threads (for proactive agent) ────────────────────

export async function listSentEmails(userId, maxResults = 10, afterDate = null) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const gmail = google.gmail({ version: "v1", auth });
  let q = "in:sent";
  if (afterDate) q += ` after:${afterDate}`; // format: YYYY/MM/DD

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q,
  });

  if (!list.data.messages) return [];

  const messages = await Promise.all(
    list.data.messages.map(async (msg) => {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["To", "Subject", "Date"],
      });
      const headers = full.data.payload?.headers || [];
      const get = (name) => headers.find((h) => h.name === name)?.value || "";
      return {
        id: msg.id,
        threadId: full.data.threadId,
        to: get("To"),
        subject: get("Subject"),
        date: get("Date"),
        snippet: full.data.snippet || "",
      };
    })
  );

  return messages;
}

export async function getThreadMessageCount(userId, threadId) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const gmail = google.gmail({ version: "v1", auth });
  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "minimal",
  });

  return thread.data.messages?.length || 0;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export async function listEvents(userId, maxResults = 20) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();

  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (result.data.items || []).map((event) => ({
    id: event.id,
    summary: event.summary || "(No title)",
    description: event.description || "",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    location: event.location || "",
    attendees: (event.attendees || []).map((a) => a.email),
    htmlLink: event.htmlLink || "",
  }));
}

export async function listUpcomingEvents(userId, hoursAhead = 24) {
  const auth = await getAuthenticatedClient(userId);
  if (!auth) throw new Error("Google account not connected.");

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const until = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (result.data.items || []).map((event) => ({
    id: event.id,
    summary: event.summary || "(No title)",
    description: event.description || "",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    location: event.location || "",
    attendees: (event.attendees || []).map((a) => a.email),
  }));
}
