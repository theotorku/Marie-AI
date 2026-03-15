import Stripe from "stripe";
import { getDb } from "./db.js";

let stripe;

function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set in .env");
  stripe = new Stripe(key);
  return stripe;
}

// ── Tier config ──────────────────────────────────────────────────────────────

export const TIERS = {
  free: {
    name: "Essentials",
    price: 0,
    messagesPerDay: 20,
    maxTasks: 10,
    maxOutputTokens: 512,
    model: "claude-haiku-4-5",
    rateLimit: 5,
    gmail: false,
    calendar: false,
    chatHistoryDays: 7,
  },
  professional: {
    name: "Professional",
    price: 29,
    messagesPerDay: 100,
    maxTasks: null, // unlimited
    maxOutputTokens: 1024,
    model: "claude-sonnet-4-6",
    rateLimit: 20,
    gmail: true,
    calendar: true,
    chatHistoryDays: null, // unlimited
  },
};

// ── Usage tracking ───────────────────────────────────────────────────────────

export async function getDailyMessageCount(userId) {
  const db = getDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", today.toISOString());

  return count || 0;
}

export async function checkUsageLimit(userId, tier) {
  const config = TIERS[tier] || TIERS.free;
  const used = await getDailyMessageCount(userId);
  return {
    allowed: used < config.messagesPerDay,
    used,
    limit: config.messagesPerDay,
    remaining: Math.max(0, config.messagesPerDay - used),
  };
}

// ── User tier lookup ─────────────────────────────────────────────────────────

export async function getUserTier(userId) {
  const db = getDb();
  const { data } = await db
    .from("users")
    .select("tier")
    .eq("id", userId)
    .single();
  return data?.tier || "free";
}

// ── Stripe checkout ──────────────────────────────────────────────────────────

export async function createCheckoutSession(userId, userEmail) {
  const s = getStripe();
  const db = getDb();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRO_PRICE_ID not set in .env");

  // Get or create Stripe customer
  const { data: user } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await s.customers.create({ email: userEmail, metadata: { userId } });
    customerId = customer.id;
    await db.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL || "http://localhost:5173"}?upgraded=true`,
    cancel_url: `${process.env.APP_URL || "http://localhost:5173"}?cancelled=true`,
    metadata: { userId },
  });

  return session.url;
}

export async function createPortalSession(userId) {
  const s = getStripe();
  const db = getDb();

  const { data: user } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (!user?.stripe_customer_id) throw new Error("No billing account found.");

  const session = await s.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: process.env.APP_URL || "http://localhost:5173",
  });

  return session.url;
}

// ── Stripe webhook handler ───────────────────────────────────────────────────

export async function handleWebhook(rawBody, signature) {
  const s = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

  const event = s.webhooks.constructEvent(rawBody, signature, secret);
  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        await db.from("users").update({
          tier: "professional",
          stripe_subscription_id: session.subscription,
        }).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.from("users").update({
        tier: "free",
        stripe_subscription_id: null,
      }).eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      if (sub.status === "active") {
        await db.from("users").update({ tier: "professional" }).eq("stripe_subscription_id", sub.id);
      } else if (sub.status === "canceled" || sub.status === "unpaid") {
        await db.from("users").update({ tier: "free" }).eq("stripe_subscription_id", sub.id);
      }
      break;
    }
  }
}
