# Marie AI

A personal AI assistant for beauty industry professionals, powered by [Claude](https://www.anthropic.com/claude) (Anthropic).

[View Landing Page](public/landing.html) | [Deployment Guide](DEPLOYMENT.md)

---

## Features

| Tab | Status | Tier | Description |
|---|---|---|---|
| Assistant | Live | Free | AI chat — draft emails, prep meetings, product Q&A |
| Products | Live | Free | Browsable product catalog with category and hero SKU filtering |
| Tasks | Live | Free (10) / Pro (unlimited) | Priority task manager with server-side persistence |
| Emails | Live | Professional | Gmail inbox — read emails, view details, compose |
| Calendar | Live | Professional | Google Calendar — upcoming events grouped by date |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy your Project URL and service_role key

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in all values — see [Deployment Guide](DEPLOYMENT.md) for details on each service.

### 4. Run

```bash
npm run dev
```

This starts both the Vite dev server (port 5173) and the Express API proxy (port 3001) concurrently.

---

## Architecture

```
Marie AI/
├── index.html                 # Vite entry point (SEO meta, OG tags, SVG favicon)
├── vite.config.js             # Vite config with API proxy
├── tsconfig.json              # TypeScript strict config
├── vitest.config.ts           # Test runner config
├── public/
│   └── landing.html           # Marketing landing page (self-contained)
├── supabase/
│   └── schema.sql             # Database schema (users, messages, tasks, tokens)
├── server/
│   ├── index.js               # Express server — all routes + static file serving
│   ├── auth.js                # JWT auth + bcrypt (reads from Supabase)
│   ├── db.js                  # Supabase client singleton
│   ├── billing.js             # Stripe integration, tier config, usage tracking
│   ├── rateLimit.js           # Sliding window rate limiter
│   └── google.js              # Google OAuth2, Gmail API, Calendar API
├── src/
│   ├── main.tsx               # React mount
│   ├── App.tsx                # Root component — layout, state, tab routing, mobile responsive
│   ├── config.ts              # CONFIG, TABS, SYSTEM_PROMPT
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── data/
│   │   └── products.ts        # Product knowledge base (PRODUCT_KB)
│   ├── hooks/
│   │   ├── useAuth.ts         # Login, register, logout, token management
│   │   ├── useChat.ts         # Chat state + API persistence (Supabase)
│   │   ├── useGoogle.ts       # Google OAuth connection + auto-detect on focus
│   │   ├── useTasks.ts        # CRUD tasks via API (Supabase)
│   │   └── useBilling.ts      # Tier info, Stripe checkout/portal
│   └── components/
│       ├── AuthScreen.tsx     # Login / register screen
│       ├── ChatBubble.tsx     # Chat message bubble
│       ├── QuickAction.tsx    # Pre-filled chat shortcut button
│       ├── TaskItem.tsx       # Task row with toggle + delete
│       ├── ProductCard.tsx    # Product catalog card
│       ├── EmailsTab.tsx      # Gmail inbox — list, read (upgrade prompt for free)
│       ├── CalendarTab.tsx    # Calendar events (upgrade prompt for free)
│       └── PricingBanner.tsx  # Upgrade CTA / usage display
└── .env.example               # Environment variable template
```

### API Routes

```
Auth (public):
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me              → returns user + tier from DB

Billing:
  GET  /api/billing/tier         → tier config + daily usage
  POST /api/billing/checkout     → Stripe Checkout session
  POST /api/billing/portal       → Stripe Customer Portal
  POST /api/billing/webhook      → Stripe event handler

Chat (tier-aware):
  POST /api/chat                 → Claude API (Haiku for free, Sonnet for Pro)

Messages:
  GET  /api/messages             → chat history (7 days free, unlimited Pro)
  POST /api/messages             → persist message

Tasks:
  GET  /api/tasks
  POST /api/tasks                → enforces 10-task cap on free tier
  PATCH /api/tasks/:id
  DELETE /api/tasks/:id

Google OAuth:
  GET  /api/google/status
  GET  /api/google/auth-url
  GET  /api/google/callback
  POST /api/google/disconnect

Gmail (Pro only):
  GET  /api/gmail/messages
  GET  /api/gmail/messages/:id
  POST /api/gmail/send

Calendar (Pro only):
  GET  /api/calendar/events
```

### Security

- API keys never touch the browser — all Claude/Google calls go through Express
- CORS locked to `APP_URL` origin
- JWT auth on all protected routes
- Passwords hashed with bcrypt (10 rounds)
- Google OAuth tokens stored per-user in Supabase
- Stripe webhook signature verification
- Rate limiting: 5 req/min (free) / 20 req/min (Pro)

---

## Monetization

| | Essentials (Free) | Professional ($29/mo) |
|---|---|---|
| AI Model | Claude Haiku 4.5 | Claude Sonnet 4.6 |
| Messages/day | 20 | 100 |
| Max output tokens | 512 | 1,024 |
| Tasks | 10 | Unlimited |
| Gmail | Locked | Included |
| Calendar | Locked | Included |
| Chat history | 7 days | Unlimited |
| Rate limit | 5/min | 20/min |

All limits enforced server-side. Stripe handles subscriptions with webhook-driven tier updates.

---

## Adding Products

Extend `src/data/products.ts`:

```ts
{ name: "Product Name", category: "Face", hero: false, description: "...", price: "$00", sku: "MAI-XXX-001" }
```

Claude automatically references new products via the system prompt.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client + server |
| `npm run dev:client` | Vite dev server only |
| `npm run dev:server` | Express proxy only |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type check |

---

## Roadmap

- [x] Backend API proxy (secure key handling)
- [x] Component split into separate files
- [x] TypeScript migration
- [x] Unit and component tests (Vitest + React Testing Library)
- [x] Rate limiting on API calls
- [x] User authentication (JWT + bcrypt)
- [x] Gmail OAuth2 integration
- [x] Google Calendar integration
- [x] Supabase database (users, messages, tasks, tokens)
- [x] Stripe monetization (Free + Professional tiers)
- [x] Tier-aware usage limits + feature gating
- [x] Mobile responsive design
- [x] Production hardening (CORS, static serving, SEO)
- [x] Landing page
- [x] Deployment guide
