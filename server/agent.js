import { getDb } from "./db.js";
import { getUserTier, TIERS } from "./billing.js";
import {
  isConnected, listEmails, listSentEmails,
  getThreadMessageCount, listEvents, listUpcomingEvents,
} from "./n8n.js";
import { deliverNotificationToSlack } from "./slack.js";

// Product catalog (server-side copy for agent prompts)
const PRODUCTS = [
  { name: "Skin Blurring Balm Powder", category: "Face", hero: true, price: "$38", sku: "MAI-BBP-001" },
  { name: "Vision Flush Glow", category: "Cheeks", hero: true, price: "$28", sku: "MAI-VFG-001" },
  { name: "ColorFix Eye, Cheek & Lip", category: "Multi-use", hero: true, price: "$18", sku: "MAI-CF-001" },
  { name: "Blemish Balm Beauty Balm", category: "Face", price: "$32", sku: "MAI-BBBB-001" },
  { name: "Vision Cream Cover", category: "Face", price: "$42", sku: "MAI-VCC-001" },
  { name: "Evolution Powder", category: "Face", price: "$34", sku: "MAI-EP-001" },
  { name: "Glow Perfect Micro Highlighter", category: "Cheeks", price: "$26", sku: "MAI-GPH-001" },
  { name: "Lip Vinyl", category: "Lips", price: "$22", sku: "MAI-LV-001" },
];

// ── Claude helper ────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userPrompt, model = "claude-haiku-4-5") {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude API error");
  return data.content?.[0]?.text || "";
}

// ── Agent run tracking ───────────────────────────────────────────────────

async function startRun(userId, jobType) {
  const db = getDb();
  const { data } = await db
    .from("agent_runs")
    .insert({ user_id: userId, job_type: jobType })
    .select("id")
    .single();
  return data.id;
}

async function completeRun(runId, result) {
  const db = getDb();
  await db.from("agent_runs").update({
    status: "completed",
    result,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
}

async function failRun(runId, error) {
  const db = getDb();
  await db.from("agent_runs").update({
    status: "failed",
    error,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
}

// ── Insert notification ──────────────────────────────────────────────────

async function createNotification(userId, type, title, content, metadata = null) {
  const db = getDb();
  // Check if user has Slack connected for channel routing
  const { data: slack } = await db
    .from("slack_connections")
    .select("id")
    .eq("user_id", userId)
    .single();

  const channel = slack ? "both" : "web";

  const { data } = await db
    .from("notifications")
    .insert({ user_id: userId, type, title, content, channel, metadata })
    .select()
    .single();

  // Deliver to Slack if connected
  if (channel === "both" && data) {
    deliverNotificationToSlack({ ...data, user_id: userId }).catch((err) =>
      console.error("[agent] Slack delivery failed:", err.message)
    );
  }

  return data;
}

// ── Daily Briefing ───────────────────────────────────────────────────────

export async function generateDailyBriefing(userId) {
  const runId = await startRun(userId, "daily_briefing");

  try {
    const db = getDb();
    const googleConnected = await isConnected(userId);
    const tier = await getUserTier(userId);
    const model = TIERS[tier]?.model || "claude-haiku-4-5";

    // Gather context
    const { data: tasks } = await db
      .from("tasks")
      .select("text, priority, done")
      .eq("user_id", userId)
      .eq("done", false)
      .order("created_at");

    let emails = [];
    let events = [];
    if (googleConnected) {
      try { emails = await listEmails(userId, 5); } catch { /* no-op */ }
      try { events = await listUpcomingEvents(userId, 24); } catch { /* no-op */ }
    }

    const unreadEmails = emails.filter((e) => e.unread);

    // CRM context — stale contacts and pipeline summary
    const { data: contacts } = await db
      .from("contacts")
      .select("name, company, stage, last_contacted_at")
      .eq("user_id", userId);

    const contactList = contacts || [];
    const staleThreshold = 14; // days
    const staleContacts = contactList.filter((c) => {
      if (!c.last_contacted_at) return true;
      const days = Math.floor((Date.now() - new Date(c.last_contacted_at).getTime()) / 86400000);
      return days >= staleThreshold && c.stage !== "closed" && c.stage !== "lost";
    });

    const pipelineSummary = {};
    for (const c of contactList) {
      pipelineSummary[c.stage] = (pipelineSummary[c.stage] || 0) + 1;
    }

    const context = {
      tasks: tasks || [],
      unreadEmails: unreadEmails.map((e) => ({ from: e.from, subject: e.subject })),
      todayEvents: events.map((e) => ({ summary: e.summary, start: e.start, attendees: e.attendees })),
      staleContacts,
      pipelineSummary,
    };

    const systemPrompt = `You are Marie AI, a proactive assistant for beauty industry professionals. Generate a concise, actionable daily briefing. Use a warm, professional tone. Structure it with clear sections. Include CRM insights if there are contacts needing attention. Keep it under 350 words.`;

    const userPrompt = `Generate my morning briefing for ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.

Here's my current status:
- Open tasks (${context.tasks.length}): ${context.tasks.map((t) => `[${t.priority}] ${t.text}`).join("; ") || "None"}
- Unread emails (${context.unreadEmails.length}): ${context.unreadEmails.map((e) => `From ${e.from}: "${e.subject}"`).join("; ") || "None"}
- Today's meetings (${context.todayEvents.length}): ${context.todayEvents.map((e) => `${e.summary} at ${e.start}${e.attendees?.length ? ` with ${e.attendees.join(", ")}` : ""}`).join("; ") || "None"}
- Pipeline: ${Object.entries(context.pipelineSummary).map(([stage, count]) => `${count} ${stage}`).join(", ") || "No contacts yet"}
- Contacts needing attention (${staleContacts.length}): ${staleContacts.slice(0, 5).map((c) => `${c.name}${c.company ? ` at ${c.company}` : ""} (${c.stage})`).join("; ") || "All up to date"}

Give me a prioritized briefing with what to focus on first.`;

    const content = await callClaude(systemPrompt, userPrompt, model);

    const notification = await createNotification(
      userId, "daily_briefing", "Your Daily Briefing", content, context
    );

    await completeRun(runId, { notificationId: notification.id });
    return notification;
  } catch (err) {
    await failRun(runId, err.message);
    throw err;
  }
}

// ── Follow-Up Nudges ─────────────────────────────────────────────────────

export async function detectFollowUpNudges(userId) {
  const runId = await startRun(userId, "follow_up_nudge");

  try {
    const googleConnected = await isConnected(userId);
    if (!googleConnected) {
      await completeRun(runId, { skipped: "Google not connected" });
      return [];
    }

    const tier = await getUserTier(userId);
    const model = TIERS[tier]?.model || "claude-haiku-4-5";
    const prefs = await getAgentPrefs(userId);
    const followUpDays = prefs.followUpDays || 3;

    // Get sent emails from N days ago
    const afterDate = new Date();
    afterDate.setDate(afterDate.getDate() - (followUpDays + 2));
    const dateStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, "0")}/${String(afterDate.getDate()).padStart(2, "0")}`;

    const sentEmails = await listSentEmails(userId, 15, dateStr);

    // Check which threads have no reply (only 1 message in thread = no reply)
    const needsFollowUp = [];
    for (const email of sentEmails) {
      const count = await getThreadMessageCount(userId, email.threadId);
      if (count === 1) {
        const sentDate = new Date(email.date);
        const daysSince = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= followUpDays) {
          needsFollowUp.push({ ...email, daysSince });
        }
      }
    }

    if (needsFollowUp.length === 0) {
      await completeRun(runId, { nudges: 0 });
      return [];
    }

    // Generate nudge for each
    const notifications = [];
    for (const email of needsFollowUp.slice(0, 5)) {
      const systemPrompt = `You are Marie AI. Suggest a brief, professional follow-up message for a beauty industry professional. Keep the suggestion under 100 words. Include a draft one-liner they could send.`;
      const userPrompt = `I sent an email to ${email.to} with subject "${email.subject}" ${email.daysSince} days ago and haven't received a reply. The original message preview: "${email.snippet}". Suggest a follow-up.`;

      const content = await callClaude(systemPrompt, userPrompt, model);

      const notification = await createNotification(
        userId, "follow_up_nudge",
        `Follow up with ${email.to}`,
        content,
        { originalEmailId: email.id, to: email.to, subject: email.subject, daysSince: email.daysSince }
      );
      notifications.push(notification);
    }

    await completeRun(runId, { nudges: notifications.length });
    return notifications;
  } catch (err) {
    await failRun(runId, err.message);
    throw err;
  }
}

// ── Meeting Prep ─────────────────────────────────────────────────────────

export async function prepareMeetingBriefing(userId) {
  const runId = await startRun(userId, "meeting_prep");

  try {
    const googleConnected = await isConnected(userId);
    if (!googleConnected) {
      await completeRun(runId, { skipped: "Google not connected" });
      return [];
    }

    const tier = await getUserTier(userId);
    const model = TIERS[tier]?.model || "claude-haiku-4-5";

    const events = await listUpcomingEvents(userId, 4);
    if (events.length === 0) {
      await completeRun(runId, { meetings: 0 });
      return [];
    }

    const db = getDb();
    const notifications = [];

    for (const event of events) {
      // Skip if we already have a meeting prep for this event
      const { count } = await db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "meeting_prep")
        .contains("metadata", { eventId: event.id });

      if (count > 0) continue;

      const productContext = PRODUCTS.map((p) => `${p.name} (${p.category}, ${p.price})`).join(", ");

      const systemPrompt = `You are Marie AI, a proactive assistant for beauty industry professionals. Prepare concise meeting talking points. Include relevant product mentions if the meeting seems buyer/retail related. Keep it under 200 words. Our product line: ${productContext}`;

      const userPrompt = `Prepare me for this upcoming meeting:
- Title: ${event.summary}
- Time: ${event.start}
- Location: ${event.location || "Not specified"}
- Description: ${event.description || "None"}
- Attendees: ${event.attendees?.join(", ") || "Not listed"}

Give me 3-5 key talking points and any preparation steps.`;

      const content = await callClaude(systemPrompt, userPrompt, model);

      const notification = await createNotification(
        userId, "meeting_prep",
        `Prep: ${event.summary}`,
        content,
        { eventId: event.id, eventStart: event.start, eventSummary: event.summary }
      );
      notifications.push(notification);
    }

    await completeRun(runId, { meetings: notifications.length });
    return notifications;
  } catch (err) {
    await failRun(runId, err.message);
    throw err;
  }
}

// ── Restock / Seasonal Alerts ────────────────────────────────────────────

export async function checkRestockAlerts(userId) {
  const runId = await startRun(userId, "restock_alert");

  try {
    const tier = await getUserTier(userId);
    const model = TIERS[tier]?.model || "claude-haiku-4-5";

    const month = new Date().getMonth(); // 0-indexed
    const seasonMap = {
      spring: [2, 3, 4],
      summer: [5, 6, 7],
      fall: [8, 9, 10],
      holiday: [11, 0, 1],
    };

    const currentSeason = Object.entries(seasonMap).find(([, months]) => months.includes(month))?.[0] || "spring";
    const productList = PRODUCTS.map((p) => `${p.name} (${p.category}, ${p.price}, SKU: ${p.sku}${p.hero ? ", HERO" : ""})`).join("\n");

    const systemPrompt = `You are Marie AI, a proactive assistant for beauty industry professionals. Generate seasonal product strategy alerts — what to pitch, restock suggestions, and seasonal positioning tips. Keep it under 250 words.`;

    const userPrompt = `It's currently ${currentSeason} season (${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}).

Our product line:
${productList}

Give me seasonal recommendations: which products to push, restock priorities, and any upcoming seasonal opportunities to prepare for.`;

    const content = await callClaude(systemPrompt, userPrompt, model);

    const notification = await createNotification(
      userId, "restock_alert",
      `${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)} Product Strategy`,
      content,
      { season: currentSeason, month }
    );

    await completeRun(runId, { notificationId: notification.id });
    return notification;
  } catch (err) {
    await failRun(runId, err.message);
    throw err;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function getAgentPrefs(userId) {
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("agent_preferences")
    .eq("id", userId)
    .single();
  return data?.agent_preferences || {};
}

// ── Run all agent jobs for a user ────────────────────────────────────────

export async function runAllJobs(userId, jobTypes = ["daily_briefing", "follow_up_nudge", "meeting_prep"]) {
  const results = {};
  for (const job of jobTypes) {
    try {
      switch (job) {
        case "daily_briefing":
          results[job] = await generateDailyBriefing(userId);
          break;
        case "follow_up_nudge":
          results[job] = await detectFollowUpNudges(userId);
          break;
        case "meeting_prep":
          results[job] = await prepareMeetingBriefing(userId);
          break;
        case "restock_alert":
          results[job] = await checkRestockAlerts(userId);
          break;
      }
    } catch (err) {
      results[job] = { error: err.message };
    }
  }
  return results;
}
