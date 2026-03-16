import crypto from "crypto";
import { getDb } from "./db.js";
import { getUserTier, TIERS } from "./billing.js";

// ── Slack request verification ───────────────────────────────────────────

export function verifySlackRequest(req) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) throw new Error("SLACK_SIGNING_SECRET not set");

  const timestamp = req.headers["x-slack-request-timestamp"];
  const slackSig = req.headers["x-slack-signature"];

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${req.rawBody}`;
  const hash = "v0=" + crypto.createHmac("sha256", signingSecret).update(baseString).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(slackSig));
}

// ── OAuth ────────────────────────────────────────────────────────────────

export function getSlackAuthUrl(userId) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error("SLACK_CLIENT_ID not set");

  const redirectUri = `${process.env.APP_URL || "http://localhost:3001"}/api/slack/callback`;
  const scopes = "chat:write,commands,im:history,im:write,channels:read";

  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;
}

export async function handleSlackCallback(code, userId) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL || "http://localhost:3001"}/api/slack/callback`;

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Slack OAuth failed");

  const db = getDb();
  await db.from("slack_connections").upsert({
    user_id: userId,
    slack_team_id: data.team?.id,
    slack_team_name: data.team?.name,
    slack_user_id: data.authed_user?.id,
    access_token: data.authed_user?.access_token || "",
    bot_token: data.access_token,
    scopes: data.scope,
  }, { onConflict: "slack_team_id,slack_user_id" });

  return data;
}

export async function getSlackConnection(userId) {
  const db = getDb();
  const { data } = await db
    .from("slack_connections")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function disconnectSlack(userId) {
  const db = getDb();
  await db.from("slack_connections").delete().eq("user_id", userId);
}

// ── Slash command handler ────────────────────────────────────────────────

export async function handleSlashCommand(payload) {
  const { text, user_id: slackUserId, team_id: teamId, response_url: responseUrl } = payload;

  // Look up Marie AI user from Slack identity
  const db = getDb();
  const { data: conn } = await db
    .from("slack_connections")
    .select("user_id, bot_token")
    .eq("slack_team_id", teamId)
    .eq("slack_user_id", slackUserId)
    .single();

  if (!conn) {
    return {
      response_type: "ephemeral",
      text: "Your Slack account isn't linked to Marie AI yet. Log in at " +
        (process.env.APP_URL || "https://jmarie.beauty") +
        " and connect Slack from your settings.",
    };
  }

  // Check tier
  const tier = await getUserTier(conn.user_id);
  const config = TIERS[tier] || TIERS.free;
  if (!config.slack) {
    return {
      response_type: "ephemeral",
      text: "Slack integration requires a Professional plan. Upgrade at " +
        (process.env.APP_URL || "https://jmarie.beauty"),
    };
  }

  if (!text?.trim()) {
    return {
      response_type: "ephemeral",
      text: "Usage: `/marie <your question>`\nExample: `/marie help me draft a follow-up email to the Sephora buyer`",
    };
  }

  // Respond async — Claude may take > 3s
  processSlackMessage(conn.user_id, text, responseUrl, config).catch((err) =>
    console.error("[slack] Command processing error:", err.message)
  );

  return {
    response_type: "ephemeral",
    text: "Thinking... Marie AI is working on your request.",
  };
}

// ── DM event handler ─────────────────────────────────────────────────────

export async function handleSlackEvent(body) {
  // URL verification challenge
  if (body.type === "url_verification") {
    return { challenge: body.challenge };
  }

  if (body.event?.type === "message" && !body.event.bot_id && body.event.channel_type === "im") {
    const slackUserId = body.event.user;
    const text = body.event.text;
    const channel = body.event.channel;

    const db = getDb();
    const { data: conn } = await db
      .from("slack_connections")
      .select("user_id, bot_token")
      .eq("slack_user_id", slackUserId)
      .single();

    if (!conn) return { ok: true };

    const tier = await getUserTier(conn.user_id);
    const config = TIERS[tier] || TIERS.free;
    if (!config.slack) {
      await postSlackMessage(conn.bot_token, channel,
        "Slack integration requires a Professional plan. Upgrade at " +
        (process.env.APP_URL || "https://jmarie.beauty"));
      return { ok: true };
    }

    // Process in background
    processDMMessage(conn.user_id, text, conn.bot_token, channel, config).catch((err) =>
      console.error("[slack] DM processing error:", err.message)
    );
  }

  return { ok: true };
}

// ── Process messages via Claude ──────────────────────────────────────────

async function processSlackMessage(userId, text, responseUrl, config) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    await sendResponseUrl(responseUrl, "Marie AI is temporarily unavailable.");
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxOutputTokens,
        system: "You are Marie AI, a helpful assistant for beauty industry professionals. Keep responses concise and actionable — this is a Slack conversation. Use plain text, not markdown.",
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that request.";

    await sendResponseUrl(responseUrl, reply);
  } catch {
    await sendResponseUrl(responseUrl, "Something went wrong. Please try again.");
  }
}

async function processDMMessage(userId, text, botToken, channel, config) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxOutputTokens,
        system: "You are Marie AI, a helpful assistant for beauty industry professionals. Keep responses concise and actionable — this is a Slack conversation. Use plain text, not markdown.",
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I couldn't process that request.";

    await postSlackMessage(botToken, channel, reply);
  } catch (err) {
    await postSlackMessage(botToken, channel, "Something went wrong. Please try again.");
  }
}

// ── Post notification to Slack ───────────────────────────────────────────

export async function deliverNotificationToSlack(notification) {
  const db = getDb();
  const { data: conn } = await db
    .from("slack_connections")
    .select("bot_token, slack_user_id, slack_channel_id")
    .eq("user_id", notification.user_id)
    .single();

  if (!conn) return false;

  const channel = conn.slack_channel_id || conn.slack_user_id; // DM if no channel set
  const blocks = formatNotificationBlocks(notification);

  await postSlackMessage(conn.bot_token, channel, notification.title, blocks);

  await db.from("notifications")
    .update({ delivered: true })
    .eq("id", notification.id);

  return true;
}

function formatNotificationBlocks(notification) {
  const typeEmoji = {
    daily_briefing: ":sunny:",
    follow_up_nudge: ":envelope:",
    meeting_prep: ":clipboard:",
    restock_alert: ":package:",
  };

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `${typeEmoji[notification.type] || ":bell:"} ${notification.title}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: notification.content.slice(0, 2900) }, // Slack block limit
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Marie AI · ${new Date(notification.created_at).toLocaleString()}` },
      ],
    },
  ];
}

// ── Slack API helpers ────────────────────────────────────────────────────

async function postSlackMessage(botToken, channel, text, blocks = null) {
  const body = { channel, text };
  if (blocks) body.blocks = blocks;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function sendResponseUrl(responseUrl, text) {
  await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      response_type: "ephemeral",
      text,
    }),
  });
}
