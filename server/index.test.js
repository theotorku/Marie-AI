// @vitest-environment node
import jwt from "jsonwebtoken";

const mocks = vi.hoisted(() => ({
  billing: {
    TIERS: {
      free: { rateLimit: 2, slack: false, maxOutputTokens: 512, model: "claude-haiku-4-5" },
      professional: { rateLimit: 10, slack: true, maxOutputTokens: 1024, model: "claude-sonnet-4-6" },
    },
    getUserTier: vi.fn(),
    checkUsageLimit: vi.fn(),
    getDailyMessageCount: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    handleWebhook: vi.fn(),
  },
  google: { getAuthUrl: vi.fn(), handleCallback: vi.fn(), isConnected: vi.fn(), disconnect: vi.fn(), listEmails: vi.fn(), getEmail: vi.fn(), sendEmail: vi.fn(), listEvents: vi.fn() },
  slack: { verifySlackRequest: vi.fn(), getSlackAuthUrl: vi.fn(), handleSlackCallback: vi.fn(), getSlackConnection: vi.fn(), disconnectSlack: vi.fn(), handleSlashCommand: vi.fn(), handleSlackEvent: vi.fn() },
  oauth: { createOAuthState: vi.fn(), createOAuthStateCookie: vi.fn(), clearOAuthStateCookie: vi.fn(), consumeOAuthState: vi.fn() },
  agent: { generateDailyBriefing: vi.fn(), detectFollowUpNudges: vi.fn(), prepareMeetingBriefing: vi.fn(), checkRestockAlerts: vi.fn(), runAllJobs: vi.fn() },
  db: { getDb: vi.fn(() => ({ from: vi.fn() })) },
}));

vi.mock("./db.js", () => mocks.db);
vi.mock("./billing.js", () => mocks.billing);
vi.mock("./google.js", () => mocks.google);
vi.mock("./slack.js", () => mocks.slack);
vi.mock("./oauthState.js", () => mocks.oauth);
vi.mock("./agent.js", () => mocks.agent);

const { createApp } = await import("./index.js");

async function withServer(run) {
  const server = createApp().listen(0);
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function authHeaders(user = { id: "user-1", email: "user@example.com" }) {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
  return { Authorization: `Bearer ${token}` };
}

describe("server routes", () => {
  const realFetch = globalThis.fetch.bind(globalThis);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "route-test-secret";
    process.env.CLAUDE_API_KEY = "claude-test-key";
    mocks.billing.getUserTier.mockResolvedValue("free");
    mocks.billing.checkUsageLimit.mockResolvedValue({ allowed: true, limit: 20, remaining: 20 });
    mocks.google.getAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/auth");
    mocks.oauth.createOAuthState.mockReturnValue("signed-google-state");
    mocks.oauth.createOAuthStateCookie.mockReturnValue("marie_google_oauth_state=signed-google-state; HttpOnly");
    mocks.oauth.clearOAuthStateCookie.mockReturnValue("marie_google_oauth_state=; Max-Age=0");
    mocks.oauth.consumeOAuthState.mockReturnValue({ ok: false, error: "Invalid OAuth state." });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a Google auth URL and sets the state cookie", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/google/auth-url`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://accounts.google.com/o/oauth2/auth" });
      expect(mocks.oauth.createOAuthState).toHaveBeenCalledWith("google", "user-1");
      expect(mocks.google.getAuthUrl).toHaveBeenCalledWith("signed-google-state");
      expect(res.headers.get("set-cookie")).toContain("marie_google_oauth_state=signed-google-state");
    });
  });

  it("rejects an invalid Google callback state and clears the cookie", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/google/callback?code=test-code&state=bad-state`, {
        headers: { Cookie: "marie_google_oauth_state=bad-state" },
      });
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("Invalid OAuth state.");
      expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
      expect(mocks.google.handleCallback).not.toHaveBeenCalled();
    });
  });

  it("blocks Slack auth-url access for free-tier users", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/slack/auth-url`, { headers: authHeaders() });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "slack requires a Professional plan. Upgrade to unlock this feature.",
        upgrade: true,
      });
      expect(mocks.slack.getSlackAuthUrl).not.toHaveBeenCalled();
    });
  });

  it("enforces chat rate limits across repeated requests", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith("http://127.0.0.1:")) return realFetch(input, init);
      return { ok: true, status: 200, json: async () => ({ content: [{ text: "Hi" }] }) };
    }));

    await withServer(async (baseUrl) => {
      const options = {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
      };
      const first = await realFetch(`${baseUrl}/api/chat`, options);
      const second = await realFetch(`${baseUrl}/api/chat`, options);
      const third = await realFetch(`${baseUrl}/api/chat`, options);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(429);
      expect(await third.json()).toEqual({ error: expect.stringContaining("Rate limit exceeded") });
    });
  });
});