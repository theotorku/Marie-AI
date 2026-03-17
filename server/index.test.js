// @vitest-environment node
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mocks = vi.hoisted(() => ({
  billing: {
    TIERS: {
      free: { rateLimit: 2, slack: false, maxTasks: 10, maxOutputTokens: 512, model: "claude-haiku-4-5" },
      professional: { rateLimit: 10, slack: true, maxTasks: null, maxOutputTokens: 1024, model: "claude-sonnet-4-6" },
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

let dbFactories = {};

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

function setDbFactories(factories) {
  dbFactories = factories;
  mocks.db.getDb.mockImplementation(() => ({
    from: vi.fn((table) => {
      const factory = dbFactories[table];
      if (!factory) throw new Error(`No DB mock configured for ${table}`);
      return factory();
    }),
  }));
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
    setDbFactories({});
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

  it("validates required register fields", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Email, password, and name are required.",
      });
    });
  });

  it("validates register password length", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "short",
          name: "Marie",
        }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Password must be at least 8 characters.",
      });
    });
  });

  it("registers a new user and returns a signed token", async () => {
    const existingUserQuery = {
      select: vi.fn(() => existingUserQuery),
      eq: vi.fn(() => existingUserQuery),
      single: vi.fn().mockResolvedValue({ data: null }),
    };
    const insertUserQuery = {
      insert: vi.fn(() => insertUserQuery),
      select: vi.fn(() => insertUserQuery),
      single: vi.fn().mockResolvedValue({
        data: { id: "user-2", email: "new@example.com", name: "New User" },
        error: null,
      }),
    };
    const usersFactory = vi.fn()
      .mockImplementationOnce(() => existingUserQuery)
      .mockImplementationOnce(() => insertUserQuery);
    setDbFactories({ users: usersFactory });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          name: "New User",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.user).toEqual({
        id: "user-2",
        email: "new@example.com",
        name: "New User",
      });
      expect(typeof body.token).toBe("string");
      expect(insertUserQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: "new@example.com",
        name: "New User",
        password_hash: expect.any(String),
      }));
      expect(jwt.verify(body.token, process.env.JWT_SECRET)).toMatchObject({
        id: "user-2",
        email: "new@example.com",
      });
    });
  });

  it("rejects register when the email already exists", async () => {
    const existingUserQuery = {
      select: vi.fn(() => existingUserQuery),
      eq: vi.fn(() => existingUserQuery),
      single: vi.fn().mockResolvedValue({ data: { id: "user-1" } }),
    };
    setDbFactories({ users: () => existingUserQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
          name: "Marie",
        }),
      });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: "An account with this email already exists.",
      });
    });
  });

  it("validates required login fields", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Email and password are required.",
      });
    });
  });

  it("logs in a user with valid credentials", async () => {
    const usersQuery = {
      select: vi.fn(() => usersQuery),
      eq: vi.fn(() => usersQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "user-1",
          email: "user@example.com",
          name: "Marie",
          password_hash: await bcrypt.hash("password123", 10),
        },
      }),
    };
    setDbFactories({ users: () => usersQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user).toEqual({
        id: "user-1",
        email: "user@example.com",
        name: "Marie",
      });
      expect(jwt.verify(body.token, process.env.JWT_SECRET)).toMatchObject({
        id: "user-1",
        email: "user@example.com",
      });
    });
  });

  it("rejects login when credentials are invalid", async () => {
    const usersQuery = {
      select: vi.fn(() => usersQuery),
      eq: vi.fn(() => usersQuery),
      single: vi.fn().mockResolvedValue({ data: null }),
    };
    setDbFactories({ users: () => usersQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "wrong-password",
        }),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Invalid email or password." });
    });
  });

  it("rejects auth/me when no bearer token is provided", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/me`);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Authentication required." });
    });
  });

  it("returns the authenticated user from auth/me", async () => {
    const usersQuery = {
      select: vi.fn(() => usersQuery),
      eq: vi.fn(() => usersQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "user-1",
          email: "user@example.com",
          name: "Marie",
          tier: "free",
          onboarding_completed: false,
        },
      }),
    };
    setDbFactories({ users: () => usersQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/me`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "Marie",
          tier: "free",
          onboarding_completed: false,
        },
      });
      expect(usersQuery.select).toHaveBeenCalledWith("id, email, name, tier, onboarding_completed");
      expect(usersQuery.eq).toHaveBeenCalledWith("id", "user-1");
    });
  });

  it("marks onboarding complete for the authenticated user", async () => {
    const usersQuery = {
      update: vi.fn(() => usersQuery),
      eq: vi.fn().mockResolvedValue({}),
    };
    setDbFactories({ users: () => usersQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/auth/onboarding-complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(usersQuery.update).toHaveBeenCalledWith({ onboarding_completed: true });
      expect(usersQuery.eq).toHaveBeenCalledWith("id", "user-1");
    });
  });

  it("blocks task creation when the free-tier task cap is reached", async () => {
    const countQuery = {
      select: vi.fn(() => countQuery),
      eq: vi.fn().mockResolvedValue({ count: 10 }),
    };
    setDbFactories({ tasks: () => countQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Follow up with buyer" }),
      });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "Free plan limited to 10 tasks. Upgrade to Professional for unlimited tasks.",
        upgrade: true,
      });
      expect(countQuery.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
      expect(countQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    });
  });

  it("creates a task with default medium priority", async () => {
    const countQuery = {
      select: vi.fn(() => countQuery),
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    };
    const insertQuery = {
      insert: vi.fn(() => insertQuery),
      select: vi.fn(() => insertQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "task-1",
          text: "Follow up with buyer",
          priority: "medium",
          done: false,
          created_at: "2026-03-17T08:00:00.000Z",
        },
        error: null,
      }),
    };
    const tasksFactory = vi.fn()
      .mockImplementationOnce(() => countQuery)
      .mockImplementationOnce(() => insertQuery);
    setDbFactories({ tasks: tasksFactory });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Follow up with buyer" }),
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        task: {
          id: "task-1",
          text: "Follow up with buyer",
          priority: "medium",
          done: false,
          created_at: "2026-03-17T08:00:00.000Z",
        },
      });
      expect(insertQuery.insert).toHaveBeenCalledWith({
        user_id: "user-1",
        text: "Follow up with buyer",
        priority: "medium",
      });
    });
  });

  it("returns 404 when updating a missing task", async () => {
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
      select: vi.fn(() => updateQuery),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    setDbFactories({ tasks: () => updateQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks/task-404`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Task not found." });
      expect(updateQuery.update).toHaveBeenCalledWith({ done: true });
      expect(updateQuery.eq).toHaveBeenNthCalledWith(1, "id", "task-404");
      expect(updateQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    });
  });

  it("updates a task for the authenticated user", async () => {
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
      select: vi.fn(() => updateQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "task-1",
          text: "Follow up with buyer",
          priority: "medium",
          done: true,
          created_at: "2026-03-17T08:00:00.000Z",
        },
        error: null,
      }),
    };
    setDbFactories({ tasks: () => updateQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks/task-1`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        task: {
          id: "task-1",
          text: "Follow up with buyer",
          priority: "medium",
          done: true,
          created_at: "2026-03-17T08:00:00.000Z",
        },
      });
    });
  });

  it("lists tasks for the authenticated user", async () => {
    const listQuery = {
      select: vi.fn(() => listQuery),
      eq: vi.fn(() => listQuery),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            text: "Follow up with buyer",
            priority: "high",
            done: false,
            created_at: "2026-03-17T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    };
    setDbFactories({ tasks: () => listQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        tasks: [
          {
            id: "task-1",
            text: "Follow up with buyer",
            priority: "high",
            done: false,
            created_at: "2026-03-17T08:00:00.000Z",
          },
        ],
      });
      expect(listQuery.select).toHaveBeenCalledWith("id, text, priority, done, created_at");
      expect(listQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(listQuery.order).toHaveBeenCalledWith("created_at");
    });
  });

  it("deletes a task for the authenticated user", async () => {
    const deleteQuery = {
      delete: vi.fn(() => deleteQuery),
      eq: vi.fn(() => deleteQuery),
    };
    deleteQuery.eq
      .mockImplementationOnce(() => deleteQuery)
      .mockResolvedValueOnce({ error: null });
    setDbFactories({ tasks: () => deleteQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks/task-1`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenNthCalledWith(1, "id", "task-1");
      expect(deleteQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    });
  });

  it("returns a server error when task deletion fails", async () => {
    const deleteQuery = {
      delete: vi.fn(() => deleteQuery),
      eq: vi.fn(() => deleteQuery),
    };
    deleteQuery.eq
      .mockImplementationOnce(() => deleteQuery)
      .mockResolvedValueOnce({ error: { message: "Delete failed." } });
    setDbFactories({ tasks: () => deleteQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/tasks/task-1`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Delete failed." });
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