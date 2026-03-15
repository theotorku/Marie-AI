# Marie AI

Personal AI assistant for beauty industry professionals, powered by Claude.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Express (ESM), Node.js
- **Database:** Supabase (PostgreSQL) — users, messages, tasks, Google OAuth tokens
- **Auth:** JWT + bcrypt (server-side), Supabase for storage
- **AI:** Claude API via server-side proxy (`/api/chat`)
- **Billing:** Stripe (subscriptions, checkout, customer portal, webhooks)
- **Integrations:** Google OAuth2 for Gmail + Calendar APIs
- **Tests:** Vitest + React Testing Library (24 tests, 6 files)
- **Landing:** Self-contained HTML/CSS/JS at `public/landing.html`

## Commands

- `npm run dev` — starts Vite + Express concurrently
- `npm test` — run all tests
- `npm run typecheck` — TypeScript strict check
- `npm run build` — production build

## Project Layout

- `server/` — Express backend (auth, db, billing, rate limiting, Google OAuth, API proxy)
- `server/db.js` — Supabase client singleton
- `server/billing.js` — Stripe integration, tier config (`TIERS` object), usage tracking
- `server/google.js` — Google OAuth2 + Gmail/Calendar (all async, Supabase-backed)
- `src/components/` — React components (all `.tsx`)
- `src/hooks/` — `useAuth`, `useChat`, `useGoogle`, `useTasks`, `useBilling`
- `src/data/products.ts` — product catalog (static, injected into Claude system prompt)
- `supabase/schema.sql` — database schema (users, messages, tasks, google_tokens)
- `public/landing.html` — marketing landing page (self-contained, no build step)

## Monetization

Two-tier freemium model:

| | Free (Essentials) | Professional ($29/mo) |
|---|---|---|
| AI Model | Claude Haiku 4.5 | Claude Sonnet 4.6 |
| Messages/day | 20 | 100 |
| Max output tokens | 512 | 1,024 |
| Tasks | 10 max | Unlimited |
| Gmail | No | Yes |
| Calendar | No | Yes |
| Rate limit | 5/min | 20/min |
| Chat history | 7 days | Unlimited |

Tier enforcement: server-side in `/api/chat` (model swap, daily usage limit), `requireTier()` middleware on Gmail/Calendar, task cap on POST `/api/tasks`, history retention filter on GET `/api/messages`.

## Key Decisions

- API key never touches the browser — all Claude calls go through Express proxy
- All persistent data stored in Supabase (users, messages, tasks, OAuth tokens)
- Chat history and tasks are per-user, server-side — no localStorage dependency
- Google OAuth uses a single flow for both Gmail and Calendar scopes
- Free tier uses Haiku (~5-8x cheaper than Sonnet) to keep costs sustainable
- Stripe webhooks update tier in DB on subscription changes
- Rate limits and model selection are tier-aware, enforced server-side
- CORS locked to APP_URL, production serves static files from dist/
- `/api/auth/me` queries DB for fresh user data including tier (not just JWT payload)
- Mobile responsive: hamburger menu + off-canvas sidebar at 768px breakpoint
- Landing page is self-contained HTML (no React build dependency)
