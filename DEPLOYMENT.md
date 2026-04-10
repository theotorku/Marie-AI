# Marie AI — Deployment Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key
- A [Stripe](https://dashboard.stripe.com) account
- A [Google Cloud](https://console.cloud.google.com) project (for Gmail/Calendar)
- A hosting provider (Railway, Render, Fly.io, or VPS)

---

## Step 1: Supabase Database

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql`
3. Click **Run** to create all tables
4. Go to **Settings > API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not anon key) → `SUPABASE_SERVICE_KEY`

> The service_role key bypasses Row Level Security. Keep it server-side only.

---

## Step 2: Anthropic API Key

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Create a new API key
3. Copy it → `CLAUDE_API_KEY`

---

## Step 3: Stripe Billing

### Create product and price

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Click **Add product**
   - Name: `Marie AI Professional`
   - Price: `$29.00 / month` (recurring)
3. Copy the **Price ID** (starts with `price_`) → `STRIPE_PRO_PRICE_ID`

### API keys

1. Go to [Stripe Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
2. Copy the **Secret key** → `STRIPE_SECRET_KEY`

### Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
   - URL: `https://your-domain.com/api/billing/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

> For local development, use `stripe listen --forward-to localhost:3001/api/billing/webhook` with the [Stripe CLI](https://stripe.com/docs/stripe-cli).

---

## Step 4: Google OAuth2 (Gmail + Calendar)

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials > OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://your-domain.com/api/google/callback`
   - For local dev also add: `http://localhost:3001/api/google/callback`
3. Copy **Client ID** → `GOOGLE_CLIENT_ID`
4. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### Enable APIs

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Enable **Gmail API**
3. Enable **Google Calendar API**

### OAuth consent screen

1. Go to **OAuth consent screen**
2. Set to **External** (or Internal if using Google Workspace)
3. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar.readonly`
4. Add test users (their email addresses) — up to 100 users allowed in testing mode

> **Testing mode** allows up to 100 manually-added users without verification. Submit for verification when ready to go public.

---

## Step 5: Environment Variables

Create a `.env` file with all values:

```env
# Anthropic
CLAUDE_API_KEY=sk-ant-...

# Auth
JWT_SECRET=a-long-random-string-at-least-32-chars

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Google OAuth2
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# App
APP_URL=https://your-domain.com
PORT=3001
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Step 6: Build and Deploy

### Build the frontend

```bash
npm install
npm run build
```

This outputs static files to `dist/`.

### Production server

The Express server already handles everything in production:
- Serves the built frontend from `dist/` (static files + SPA fallback)
- CORS locked to `APP_URL`
- All API routes, auth, billing, and integrations

```bash
node server/index.js
```

### Landing page

The marketing landing page at `public/landing.html` is self-contained (no build step). Copy it to your `dist/` folder or serve it separately. Vite automatically copies `public/` contents into `dist/` during build.

---

## Deployment Options

### Option A: Railway (recommended for simplicity)

1. Push your repo to GitHub
2. Go to [railway.app](https://railway.app) and connect your repo
3. Add all environment variables in the Railway dashboard
4. Set the start command: `node server/index.js`
5. Set the build command: `npm install && npm run build`
6. Railway auto-deploys on push

### Option B: Render

1. Create a new **Web Service** at [render.com](https://render.com)
2. Connect your repo
3. Build command: `npm install && npm run build`
4. Start command: `node server/index.js`
5. Add environment variables in the dashboard

### Option C: Fly.io

Create a `fly.toml`:

```toml
app = "marie-ai"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3001"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

```bash
fly launch
fly secrets set CLAUDE_API_KEY=sk-ant-... JWT_SECRET=... # etc
fly deploy
```

### Option D: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "server/index.js"]
```

```bash
docker build -t marie-ai .
docker run -p 3001:3001 --env-file .env marie-ai
```

---

## Post-Deployment Checklist

- [ ] Database tables created in Supabase
- [ ] All environment variables set on hosting provider
- [ ] Stripe webhook endpoint updated to production URL
- [ ] Google OAuth redirect URI updated to production URL
- [ ] Google OAuth consent screen configured with test users
- [ ] HTTPS enabled (required for Stripe and webhooks)
- [ ] Test user registration and login
- [ ] Test free tier chat (should use Haiku, 20 msg/day limit)
- [ ] Test free tier task cap (should block at 10 tasks)
- [ ] Test free tier history (should only show last 7 days)
- [ ] Test Stripe checkout flow (use test mode first)
- [ ] Test Google OAuth connect → Gmail and Calendar load
- [ ] Test Gmail/Calendar blocked on free tier (shows upgrade prompt)
- [ ] Verify Stripe webhook receives events (check Stripe dashboard > Webhooks > Logs)
- [ ] Test mobile responsive layout (hamburger menu, stacked content)
- [ ] Verify landing page loads at /landing.html

---

## Monitoring

### Stripe

- Monitor subscription events at [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- Revenue metrics at [dashboard.stripe.com/revenue](https://dashboard.stripe.com/revenue)

### Supabase

- Database usage at your project's dashboard
- Monitor table sizes and row counts

### Application

- Server logs from your hosting provider
- Track API errors (502s from Anthropic, 429s from rate limits)

---

## Costs at Scale

| Component | Free Tier Limit | Paid Pricing |
|---|---|---|
| Supabase | 500MB DB, 50K MAU | $25/mo (Pro) |
| Anthropic (Haiku) | N/A | ~$0.005/message |
| Anthropic (Sonnet) | N/A | ~$0.008/message |
| Stripe | 2.9% + $0.30 per transaction | — |
| Railway | $5/mo hobby | $20/mo pro |

### Revenue math at 100 paying users

```
Revenue:  100 × $29 = $2,900/mo
Stripe:   100 × $29 × 0.029 + $0.30 = ~$114/mo
API cost: 100 users × 50 msgs/day × 30 days × $0.008 = ~$1,200/mo
Supabase: $25/mo
Hosting:  $20/mo
────────────────────
Net:      ~$1,540/mo (~53% margin)
```
