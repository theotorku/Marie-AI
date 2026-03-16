# Marie AI

Personal AI assistant for beauty industry professionals, powered by Claude.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Express (ESM), Node.js
- **Database:** Supabase (PostgreSQL) — users, messages, tasks, Google OAuth tokens, notifications, slack connections
- **Auth:** JWT + bcrypt (server-side), Supabase for storage
- **AI:** Claude API via server-side proxy (`/api/chat`) + proactive agent (`server/agent.js`)
- **Billing:** Stripe (subscriptions, checkout, customer portal, webhooks)
- **Integrations:** Google OAuth2 for Gmail + Calendar APIs, Slack (OAuth, slash commands, DMs, notifications)
- **Scheduler:** node-cron for proactive agent jobs (briefings, nudges, meeting prep, restock alerts)
- **Tests:** Vitest + React Testing Library (24 tests, 6 files)
- **Landing:** Self-contained HTML/CSS/JS at `public/landing.html`
- **Deployment:** Railway (jmarie.beauty), Stripe live webhooks

## Commands

- `npm run dev` — starts Vite + Express concurrently
- `npm start` — production server (used by Railway)
- `npm test` — run all tests
- `npm run typecheck` — TypeScript strict check
- `npm run build` — production build

## Project Layout

- `server/` — Express backend (auth, db, billing, rate limiting, Google OAuth, API proxy, agent)
- `server/index.js` — main Express server, all API routes, imports scheduler on startup
- `server/db.js` — Supabase client singleton
- `server/billing.js` — Stripe integration, tier config (`TIERS` object), usage tracking
- `server/google.js` — Google OAuth2 + Gmail/Calendar (all async, Supabase-backed, includes sent mail + thread helpers)
- `server/agent.js` — proactive AI agent (daily briefings, follow-up nudges, meeting prep, restock alerts)
- `server/scheduler.js` — cron schedules for agent jobs (imported by index.js on startup)
- `server/auth.js` — user registration, login, JWT middleware
- `server/slack.js` — Slack OAuth, slash command handler, DM events, notification delivery
- `server/rateLimit.js` — tier-aware rate limiting
- `src/components/` — React components (all `.tsx`)
- `src/components/NotificationsPanel.tsx` — slide-out panel for agent notifications
- `src/components/SettingsTab.tsx` — integrations management (Google, Slack, plan)
- `src/hooks/` — `useAuth`, `useChat`, `useGoogle`, `useTasks`, `useBilling`, `useNotifications`, `useSlack`
- `src/data/products.ts` — product catalog (static, injected into Claude system prompt + agent prompts)
- `supabase/schema.sql` — database schema (users, messages, tasks, google_tokens, notifications, slack_connections, agent_runs)
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
| Proactive Agent | No | Yes |
| Slack | No | Yes |
| Rate limit | 5/min | 20/min |
| Chat history | 7 days | Unlimited |

Tier enforcement: server-side in `/api/chat` (model swap, daily usage limit), `requireTier()` middleware on Gmail/Calendar/Agent/Slack, task cap on POST `/api/tasks`, history retention filter on GET `/api/messages`.

## Proactive Agent

Server-side AI agent (`server/agent.js`) that runs on cron schedules for Professional users:

- **Daily Briefing** (8 AM EST) — summarizes today's calendar, unread emails, open tasks via Claude
- **Follow-Up Nudges** (10 AM EST) — detects sent emails with no reply after N days, suggests follow-ups
- **Meeting Prep** (every 2h weekdays) — generates talking points for upcoming meetings
- **Restock Alerts** (Monday 9 AM EST) — seasonal product strategy recommendations

Agent output is stored in the `notifications` table and surfaced via:
- In-app notification bell with unread badge + slide-out panel
- Slack delivery (auto-posted to DM or configured channel when Slack is connected)

Users can also trigger a briefing on-demand via the "Generate Daily Briefing Now" button.

API routes: `POST /api/agent/briefing`, `/api/agent/nudges`, `/api/agent/meeting-prep`, `/api/agent/restock`
Notification routes: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`

## Slack Integration

Slack integration (`server/slack.js`) enables chatting with Marie AI via Slack and receiving agent notifications:

- **`/marie` slash command** — ask Marie anything from any Slack channel (async response via `response_url` for requests > 3s)
- **DM support** — message the Marie AI bot directly in Slack
- **Notification delivery** — agent briefings, nudges, and alerts auto-post to Slack when connected
- **OAuth flow** — connect via Settings tab, tokens stored in `slack_connections` table

Slack routes:
- `POST /api/slack/command` — handles `/marie` slash command (Slack-verified, no JWT)
- `POST /api/slack/events` — handles Events API / DMs (Slack-verified)
- `GET /api/slack/auth-url` — returns OAuth URL (authenticated, Pro only)
- `GET /api/slack/callback` — handles OAuth redirect
- `GET /api/slack/status` — connection status
- `POST /api/slack/disconnect` — remove connection

Env vars needed: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`

Slack App setup (api.slack.com/apps):
- Bot scopes: `chat:write`, `commands`, `im:history`, `im:write`, `channels:read`
- Slash command URL: `https://jmarie.beauty/api/slack/command`
- Events request URL: `https://jmarie.beauty/api/slack/events`
- Event subscription: `message.im`
- OAuth redirect: `https://jmarie.beauty/api/slack/callback`

## Key Decisions

- API key never touches the browser — all Claude calls go through Express proxy
- All persistent data stored in Supabase (users, messages, tasks, OAuth tokens, notifications)
- Chat history and tasks are per-user, server-side — no localStorage dependency
- Google OAuth uses a single flow for both Gmail and Calendar scopes
- Free tier uses Haiku (~5-8x cheaper than Sonnet) to keep costs sustainable
- Stripe webhooks update tier in DB on subscription changes
- Rate limits and model selection are tier-aware, enforced server-side
- CORS locked to APP_URL, production serves static files from dist/
- `/api/auth/me` queries DB for fresh user data including tier (not just JWT payload)
- Mobile responsive: hamburger menu + off-canvas sidebar at 768px breakpoint
- Landing page is self-contained HTML (no React build dependency)
- Agent jobs do NOT count toward user's daily message limit (system-generated)
- Agent uses the user's tier model (Haiku for free, Sonnet for pro) for cost control
- Scheduler runs in-process via dynamic import on server startup
- Agent functions are idempotent — safe to re-run if a job fails
- Meeting prep deduplicates by event ID to avoid repeat notifications
- Slack slash commands respond immediately with "Thinking..." then post Claude's answer async via response_url (3s Slack timeout)
- Slack request verification uses HMAC-SHA256 signing secret with timing-safe comparison
- Slack endpoints use raw body middleware (before express.json) for signature verification, same pattern as Stripe webhook
