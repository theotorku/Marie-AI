# Marie AI

Personal AI assistant for beauty industry professionals, powered by Claude.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Express (ESM), Node.js
- **Database:** Supabase (PostgreSQL) — users, messages, tasks, google_tokens, notifications, slack_connections, agent_runs, contacts, interactions, email_templates
- **Auth:** JWT + bcrypt (server-side), Supabase for storage
- **AI:** Claude API via server-side proxy (`/api/chat`) + proactive agent (`server/agent.js`)
- **Billing:** Stripe (subscriptions, checkout, customer portal, webhooks)
- **Integrations:** Google OAuth2 (Gmail + Calendar), Slack (OAuth, slash commands, DMs, notifications)
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

- `server/` — Express backend (auth, db, billing, rate limiting, Google OAuth, API proxy, agent, slack, CRM)
- `server/index.js` — main Express server, all API routes, imports scheduler on startup
- `server/db.js` — Supabase client singleton
- `server/billing.js` — Stripe integration, tier config (`TIERS` object), usage tracking
- `server/google.js` — Google OAuth2 + Gmail/Calendar (includes sent mail, threads, upcoming events)
- `server/agent.js` — proactive AI agent (daily briefings, follow-up nudges, meeting prep, restock alerts, CRM-aware)
- `server/scheduler.js` — cron schedules for agent jobs (imported by index.js on startup)
- `server/auth.js` — user registration, login, JWT middleware
- `server/slack.js` — Slack OAuth, slash command handler, DM events, notification delivery
- `server/rateLimit.js` — tier-aware rate limiting
- `src/components/` — React components (all `.tsx`)
- `src/components/Onboarding.tsx` — 4-step guided onboarding flow for new users
- `src/components/NotificationsPanel.tsx` — slide-out panel for agent notifications
- `src/components/SettingsTab.tsx` — integrations management (Google, Slack, plan)
- `src/components/CRMTab.tsx` — contacts, pipeline stages, interaction timeline
- `src/components/TemplatesTab.tsx` — email template management with categories
- `src/components/AnalyticsTab.tsx` — usage stats, activity chart, task/notification breakdowns
- `src/components/PDFExport.tsx` — sell sheet and line sheet PDF generation (browser print)
- `src/hooks/` — `useAuth`, `useChat`, `useGoogle`, `useTasks`, `useBilling`, `useNotifications`, `useSlack`, `useTemplates`, `useCRM`, `useVoiceInput`
- `src/speech.d.ts` — Web Speech API type declarations
- `src/data/products.ts` — product catalog (static, injected into Claude system prompt + agent prompts)
- `supabase/schema.sql` — full database schema
- `public/landing.html` — marketing landing page (self-contained, no build step)

## Monetization

Two-tier freemium model:

| | Free (Essentials) | Professional ($29/mo) |
|---|---|---|
| AI Model | Claude Haiku 4.5 | Claude Sonnet 4.6 |
| Messages/day | 20 | 100 |
| Max output tokens | 512 | 1,024 |
| Tasks | 10 max | Unlimited |
| Voice input | Yes | Yes |
| Gmail & Calendar | No | Yes |
| CRM & Pipeline | No | Yes |
| Proactive Agent | No | Yes |
| Slack | No | Yes |
| Email Templates | No | Yes |
| Analytics | No | Yes |
| PDF Export | Yes | Yes |
| Rate limit | 5/min | 20/min |
| Chat history | 7 days | Unlimited |

Tier enforcement: server-side in `/api/chat` (model swap, daily usage limit), `requireTier()` middleware on Gmail/Calendar/Agent/Slack/CRM/Templates, task cap on POST `/api/tasks`, history retention filter on GET `/api/messages`.

## Onboarding

4-step guided flow (`src/components/Onboarding.tsx`) shown to new users on first login:

1. **Welcome** — introduces Marie AI
2. **Connect Tools** — prompts Google OAuth + upgrade to Pro
3. **Try Marie** — quick-start prompts that jump into chat
4. **Explore Features** — feature overview grid

Tracked via `onboarding_completed` column on users table. Skippable at any step. Completing triggers `POST /api/auth/onboarding-complete`.

## Proactive Agent

Server-side AI agent (`server/agent.js`) that runs on cron schedules for Professional users:

- **Daily Briefing** (8 AM EST) — summarizes calendar, unread emails, open tasks, pipeline status, and stale contacts via Claude
- **Follow-Up Nudges** (10 AM EST) — detects sent emails with no reply after N days, suggests follow-ups
- **Meeting Prep** (every 2h weekdays) — generates talking points for upcoming meetings
- **Restock Alerts** (Monday 9 AM EST) — seasonal product strategy recommendations

**CRM-aware:** Daily briefings include pipeline summary and flag contacts not reached in 14+ days.

Agent output is stored in the `notifications` table and surfaced via:
- In-app notification bell with unread badge + slide-out panel
- Slack delivery (auto-posted to DM or configured channel when Slack is connected)

Users can also trigger a briefing on-demand via the "Generate Daily Briefing Now" button.

API routes: `POST /api/agent/briefing`, `/api/agent/nudges`, `/api/agent/meeting-prep`, `/api/agent/restock`
Notification routes: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all`

## CRM

Lightweight CRM (`src/components/CRMTab.tsx`, `src/hooks/useCRM.ts`) for tracking buyers and deals:

- **Contacts** — name, company, role, email, phone, notes
- **Pipeline stages** — Lead, Pitched, Negotiating, Closed, Lost (visual stage counts with filter)
- **Interaction log** — log emails, meetings, calls, notes per contact with timestamps
- **"Ask Marie" button** — sends contact context to chat for AI-powered next-step advice
- **Last contacted tracking** — auto-updates on new interactions, shown as "2d ago" etc.

Routes: `GET/POST /api/contacts`, `PATCH/DELETE /api/contacts/:id`, `GET/POST /api/contacts/:id/interactions`

## Email Templates

Save, categorize, and reuse email content (`src/components/TemplatesTab.tsx`, `src/hooks/useTemplates.ts`):

- Categories: Buyer Outreach, Follow-Up, Order Confirmation, Meeting, General
- "Use Template" sends template content to chat for Marie to customize
- Copy-to-clipboard for quick use
- Pro-only feature (gated behind `gmail` tier flag)

Routes: `GET/POST /api/templates`, `PATCH/DELETE /api/templates/:id`

## Analytics

Usage dashboard (`src/components/AnalyticsTab.tsx`) for Professional users:

- **Stat cards** — messages today/total, task completion rate, template count
- **7-day activity chart** — bar chart of daily message volume
- **Task breakdown** — by priority with progress bars
- **Agent notifications** — breakdown by type

Route: `GET /api/analytics`

## PDF Export

Browser-based PDF generation (`src/components/PDFExport.tsx`) for product documents:

- **Sell Sheet** — hero products in a 2-column grid with descriptions and pricing
- **Line Sheet** — full catalog table with SKU, category, description, price
- Uses `window.open` + `window.print` — no server-side PDF dependency
- Export buttons on the Products tab

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

## Voice Input

Browser-based voice input (`src/hooks/useVoiceInput.ts`) using the Web Speech API:

- Mic button in chat input (between text field and Send)
- Click to start, click again to stop (or auto-stops on silence)
- Transcript appends to input field
- Pulses gold while listening
- Only renders in browsers supporting `SpeechRecognition`
- Type declarations in `src/speech.d.ts`

## Key Decisions

- API key never touches the browser — all Claude calls go through Express proxy
- All persistent data stored in Supabase (users, messages, tasks, OAuth tokens, notifications, contacts, templates)
- Chat history and tasks are per-user, server-side — no localStorage dependency
- Google OAuth uses a single flow for both Gmail and Calendar scopes
- Free tier uses Haiku (~5-8x cheaper than Sonnet) to keep costs sustainable
- Stripe webhooks update tier in DB on subscription changes
- Rate limits and model selection are tier-aware, enforced server-side
- CORS locked to APP_URL, production serves static files from dist/
- `/api/auth/me` queries DB for fresh user data including tier and onboarding status
- Mobile responsive: hamburger menu + off-canvas sidebar at 768px breakpoint
- Landing page is self-contained HTML (no React build dependency)
- Agent jobs do NOT count toward user's daily message limit (system-generated)
- Agent uses the user's tier model (Haiku for free, Sonnet for pro) for cost control
- Agent is CRM-aware — briefings include pipeline status and stale contact alerts
- Scheduler runs in-process via dynamic import on server startup
- Agent functions are idempotent — safe to re-run if a job fails
- Meeting prep deduplicates by event ID to avoid repeat notifications
- Slack slash commands respond immediately with "Thinking..." then post Claude's answer async via response_url (3s Slack timeout)
- Slack request verification uses HMAC-SHA256 signing secret with timing-safe comparison
- Slack endpoints use raw body middleware (before express.json) for signature verification, same pattern as Stripe webhook
- PDF export uses browser print dialog (Save as PDF) — zero server dependencies
- Onboarding only shows once, tracked server-side, skippable at any step
