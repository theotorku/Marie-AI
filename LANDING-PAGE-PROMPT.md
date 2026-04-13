# Marie AI — Marketing Landing Page Prompt

Use this prompt in a fresh Claude Code session to generate a new marketing landing page for Marie AI with early-access email signups.

---

## Prompt

Build a new marketing landing page at `public/landing.html` (replace the existing file) for Marie AI — the first AI assistant purpose-built for beauty industry professionals. The page is a self-contained HTML/CSS/JS file with no build step, no frameworks, no dependencies beyond Google Fonts. It must be production-ready, mobile-responsive, and optimized for conversion.

### Brand & Product Context

**Marie AI** (jmarie.beauty) is a personal AI chief of staff for beauty founders, brand owners, and sales professionals. It's powered by Claude and includes:

- **Living Command Center** — daily intelligence briefing generated fresh each morning, personalized to your business (calendar, emails, tasks, pipeline, stale contacts). Not a dashboard with numbers — a narrative briefing like a chief of staff walking into your office.
- **AI Assistant** — Claude-powered chat with markdown rendering, voice input/output, hands-free mode. Knows your product catalog, brand voice, and buyer relationships.
- **Studio** — brand-aware creative generation: social captions, email subject lines, press releases, buyer thank-you notes, product descriptions, pitch scripts. Pre-loaded with your brand context.
- **Relationship Intelligence CRM** — health scores per contact, momentum tracking, re-engagement prompts ("You haven't reached out to Sarah at Ulta in 23 days — last time a gap this long happened, you lost the shelf spot"). Pipeline stages: Lead, Pitched, Negotiating, Closed, Lost.
- **Marie Score** — single 0-100 metric measuring pipeline health, follow-up consistency, outreach cadence, and task completion. Gamified but serious.
- **Gmail & Calendar Integration** — read emails, draft AI replies, meeting prep with talking points, follow-up nudge detection.
- **Proactive Agent** — daily briefings (8 AM), follow-up nudges (10 AM), meeting prep (every 2h), restock alerts (Monday 9 AM). Delivered in-app and via Slack.
- **Slack Integration** — `/marie` slash command, DM support, notification delivery.
- **Email Templates** — save, categorize, reuse. Categories: Buyer Outreach, Follow-Up, Order Confirmation, Meeting, General.
- **PDF Export** — sell sheets and line sheets for buyer meetings.
- **Voice** — speech-to-text input + text-to-speech output with hands-free mode for on-the-go use.

**Pricing:** Free tier (Haiku, 20 msgs/day) and Professional ($29/mo — Sonnet, 100 msgs/day, all integrations).

**Target audience:** Beauty brand founders, indie cosmetics companies, beauty sales reps, retail buyer relationship managers. People who are always on the move — at trade shows, doing their makeup, driving to meetings. They need an assistant that knows beauty, not another generic AI tool.

### Design System

- **Colors:** Dark theme. Background `#0D0B09`, card surfaces `rgba(255,255,255,0.03)`, gold accents `#C4973B` / `#D4A84B` / `#8B6914`, text `#E8E0D4`, dimmed text `rgba(232,224,212,0.7)`, border `rgba(196,151,59,0.12)`.
- **Typography:** `Cormorant Garamond` (headings, serif, weight 400-700) paired with `DM Sans` (body, sans-serif, weight 300-700). The heading font gives luxury beauty editorial feel. Use `Georgia, serif` as Cormorant fallback.
- **Visual language:** Glassmorphism cards (`backdrop-filter: blur(12px)`), gold gradient buttons, subtle hover lifts (`translateY(-2px)`), staggered `fadeUp` entrance animations via IntersectionObserver, particle canvas or floating gold dots for ambient movement.
- **Vibe:** Private members' club for beauty professionals. Not corporate SaaS. Not cutesy. Warm, smart, and unmistakably built for this world.

### Page Structure

Build these sections in order:

#### 1. Navigation
- Fixed top bar, transparent → frosted glass on scroll
- Logo (Marie AI logotype in Cormorant Garamond) on the left
- Links: Features, How It Works, Pricing, centered or right-aligned
- CTA button: "Get Early Access" (gold outline, scrolls to email signup)
- Hamburger on mobile

#### 2. Hero
- Badge: "Early Access — Limited Spots" with pulsing dot
- Headline (large Cormorant Garamond, 7-9vw clamp): "Your AI Chief of Staff for Beauty" — with "Chief of Staff" in a gold shimmer gradient text
- Subheadline: "Marie AI knows your products, your buyers, and your calendar. She drafts emails, preps meetings, tracks your pipeline, and nudges you before deals go cold — so you can focus on building your brand."
- Primary CTA: "Request Early Access" (gold gradient button, scrolls to signup form)
- Secondary CTA: "See What Marie Can Do" (outline button, scrolls to features)
- Below CTAs: a stylized app screenshot/mockup showing the Command Center with the narrative briefing, action cards, and Marie Score. Build this as an HTML/CSS mockup (not an image) — a dark card with a sidebar, greeting text, briefing paragraph, and small stat cards. Animate the chat messages floating in.

#### 3. Social Proof / Trust Bar
- "Built for beauty professionals who move fast"
- Logos/names: "Sephora buyers", "Ulta reps", "Indie founders", "Trade show warriors" — styled as faint editorial text, not actual logos (we don't have permission). This signals the audience, not endorsements.

#### 4. Problem Statement
- Section title: "You're Running a Brand, Not a Desk Job"
- 3-column grid of pain points with icons:
  1. "Follow-ups fall through the cracks" — "You pitched 3 buyers last week. Did any reply? You're not sure because you've been prepping for a trade show."
  2. "Every email starts from scratch" — "You write the same buyer outreach 5 times a week with slight variations. Your brand deserves a consistent voice."
  3. "No one watches your pipeline" — "Deals go cold silently. By the time you notice, the shelf spot went to someone else."
- Closing line: "Marie watches everything so you don't have to."

#### 5. Features Showcase
- Section label: "WHAT MARIE DOES"
- Section title: "Not Another AI Chat. A Teammate."
- 6 feature cards in a responsive grid (3-col desktop, 2-col tablet, 1-col mobile):
  1. **Command Center** — "Your morning briefing, ready before your coffee. Calendar, emails, pipeline, and what needs attention — in plain English."
  2. **Studio** — "Social captions, pitch scripts, press releases — all pre-loaded with your brand voice. Generate, refine, send."
  3. **Relationship Intelligence** — "Health scores on every contact. Marie knows when a buyer is going cold and tells you before it's too late."
  4. **Marie Score** — "One number that captures how your retail business is doing. Pipeline, follow-ups, outreach, tasks — gamified and actionable."
  5. **Voice Mode** — "Hands-free on the trade show floor. Ask Marie anything through your earbuds and hear the answer back."
  6. **Proactive Alerts** — "Daily briefings at 8 AM. Follow-up nudges at 10 AM. Meeting prep 2 hours before every call. Marie works while you sleep."
- Each card: icon (use Unicode/emoji), title in Cormorant Garamond, description in DM Sans, and a tier tag ("Free" in sage green or "Pro" in gold)

#### 6. How It Works
- 3 steps, large numbers (1, 2, 3) in gold gradient:
  1. "Tell Marie About Your Brand" — "Share your products, target retailers, and communication style. Marie learns your voice in one conversation."
  2. "Connect Your Tools" — "Link Gmail, Calendar, and Slack. Marie reads your emails, preps your meetings, and delivers alerts where you already work."
  3. "Let Marie Work" — "Every morning, Marie briefs you. Every deal, Marie tracks. Every email, Marie drafts. You just show up and sell."

#### 7. Pricing Preview
- Two cards side by side:
  - **Essentials (Free)**: "Get started with AI chat, voice input, product reference, and PDF exports. 20 messages/day."
  - **Professional ($29/mo)**: "Everything in Essentials plus Gmail, Calendar, CRM, Studio, Proactive Agent, Slack, Analytics, and 100 messages/day." — with a "MOST POPULAR" badge
- Below pricing: "Early access members get 60 days of Professional free."

#### 8. Early Access Signup (THE CONVERSION SECTION)
- Section title: "Be First in Line"
- Subtitle: "We're opening Marie AI to a small group of beauty professionals. Drop your email and we'll reach out when it's your turn."
- Email input field + "Request Access" button (gold gradient)
- Below form: "No spam. No credit card. Just early access + 60 days Pro free."
- On submit: POST to `/api/waitlist` with `{ email }`. Show a success state: "You're on the list! We'll be in touch soon." with a subtle confetti/sparkle animation.
- Also store email in localStorage to show "You're already on the list" if they return.

#### 9. FAQ
- Accordion-style (click to expand):
  1. "What makes Marie different from ChatGPT?" — "Marie is purpose-built for beauty. She knows your products, your buyers, and your pipeline. She doesn't just answer questions — she watches your business and acts before you ask."
  2. "Do I need to be technical?" — "Not at all. If you can type an email, you can use Marie. Voice mode means you don't even need to type."
  3. "Is my data safe?" — "Your API key never touches the browser. All data is stored securely in Supabase with per-user isolation. We don't train on your data."
  4. "What integrations are supported?" — "Gmail, Google Calendar, and Slack today. More coming based on early access feedback."
  5. "How does pricing work?" — "Essentials is free forever. Professional is $29/mo with no annual commitment. Early access members get 60 days of Professional free."

#### 10. Footer
- Marie AI logo + tagline: "The smartest employee you've ever had."
- Links: Features, Pricing, Privacy, Terms
- Copyright: 2025 Marie AI
- Small text: "Powered by Claude"

### Technical Requirements

- **Single file:** All HTML, CSS, and JS in one `landing.html` file. No external JS libraries.
- **Google Fonts:** Import Cormorant Garamond (400, 500, 600, 700) and DM Sans (300, 400, 500, 600, 700).
- **Responsive:** Mobile-first. Hamburger menu at 768px. Stack grids on mobile. Hero text uses `clamp()`.
- **Animations:** IntersectionObserver-based reveal animations (fade up on scroll). Staggered delays on grid items. Gold shimmer on the headline. Subtle floating particles on canvas (optional but preferred).
- **Scroll behavior:** Smooth scroll on anchor links. Nav background transitions on scroll.
- **Email form:** POST to `/api/waitlist` endpoint. Handle success/error states in the UI. Store submitted email in `localStorage` to detect returning visitors.
- **Performance:** No layout shifts. Preconnect to Google Fonts. Use `loading="lazy"` on any images. Minimize reflows.
- **SEO:** Proper `<title>`, `<meta description>`, Open Graph tags, `<h1>` on hero headline, semantic HTML throughout.
- **Accessibility:** WCAG AA contrast ratios (text at 4.5:1+), focus-visible indicators, alt text, `aria-label` on interactive elements, skip link.
- **Favicon:** Use `Marie%20AI%202.png` as favicon.

### Server-Side: Waitlist Endpoint

Also create or update the server to add a `POST /api/waitlist` route in `server/index.js`:

```javascript
// Waitlist signup — stores email in Supabase
app.post("/api/waitlist", express.json(), async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required." });
  }
  try {
    const db = getDb();
    await db.from("waitlist").upsert({ email, created_at: new Date().toISOString() }, { onConflict: "email" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});
```

Add this SQL to `supabase/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS waitlist (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### What NOT to Do

- Don't use any JS frameworks (React, Vue, etc.) — this is static HTML
- Don't use any CSS frameworks (Tailwind, Bootstrap) — write custom CSS
- Don't use placeholder image URLs or external image services
- Don't use lorem ipsum — all copy is provided above
- Don't add features or sections not described above
- Don't make it feel like a generic SaaS template — this is luxury beauty, not B2B software
