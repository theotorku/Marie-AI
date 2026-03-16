import "dotenv/config";
import cron from "node-cron";
import { getDb } from "./db.js";
import {
  generateDailyBriefing,
  detectFollowUpNudges,
  prepareMeetingBriefing,
  checkRestockAlerts,
} from "./agent.js";

// Only run agent jobs for professional users with Google connected
async function getEligibleUsers() {
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("id, timezone")
    .eq("tier", "professional");
  return data || [];
}

// Run a job for all eligible users with concurrency limit
async function runForAll(jobFn, jobName) {
  const users = await getEligibleUsers();
  console.log(`[scheduler] Running ${jobName} for ${users.length} users`);

  const concurrency = 3;
  for (let i = 0; i < users.length; i += concurrency) {
    const batch = users.slice(i, i + concurrency);
    await Promise.allSettled(
      batch.map(async (user) => {
        try {
          await jobFn(user.id);
          console.log(`[scheduler] ${jobName} completed for user ${user.id}`);
        } catch (err) {
          console.error(`[scheduler] ${jobName} failed for user ${user.id}:`, err.message);
        }
      })
    );
  }
}

// ── Schedules ────────────────────────────────────────────────────────────

// Daily briefing — 8:00 AM EST every day
cron.schedule("0 8 * * *", () => runForAll(generateDailyBriefing, "daily_briefing"), {
  timezone: "America/New_York",
});

// Follow-up nudges — 10:00 AM EST every day
cron.schedule("0 10 * * *", () => runForAll(detectFollowUpNudges, "follow_up_nudge"), {
  timezone: "America/New_York",
});

// Meeting prep — every 2 hours during business hours
cron.schedule("0 7,9,11,13,15,17 * * 1-5", () => runForAll(prepareMeetingBriefing, "meeting_prep"), {
  timezone: "America/New_York",
});

// Restock/seasonal alerts — Monday 9:00 AM EST
cron.schedule("0 9 * * 1", () => runForAll(checkRestockAlerts, "restock_alert"), {
  timezone: "America/New_York",
});

console.log("[scheduler] Marie AI agent scheduler started");
console.log("[scheduler] Daily briefing: 8:00 AM EST");
console.log("[scheduler] Follow-up nudges: 10:00 AM EST");
console.log("[scheduler] Meeting prep: every 2h business hours (Mon-Fri)");
console.log("[scheduler] Restock alerts: Monday 9:00 AM EST");
