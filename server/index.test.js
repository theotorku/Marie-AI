// @vitest-environment node
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mocks = vi.hoisted(() => ({
  billing: {
    TIERS: {
      free: { rateLimit: 2, slack: false, gmail: false, proactiveAgent: false, chatHistoryDays: 7, maxTasks: 10, maxOutputTokens: 512, model: "claude-haiku-4-5" },
      professional: { rateLimit: 10, slack: true, gmail: true, proactiveAgent: true, chatHistoryDays: null, maxTasks: null, maxOutputTokens: 1024, model: "claude-sonnet-4-6" },
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

  it("blocks contacts access for free-tier users", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/contacts`, { headers: authHeaders() });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "proactiveAgent requires a Professional plan. Upgrade to unlock this feature.",
        upgrade: true,
      });
    });
  });

  it("lists contacts for a professional user", async () => {
    mocks.billing.getUserTier.mockResolvedValue("professional");

    const contactsQuery = {
      select: vi.fn(() => contactsQuery),
      eq: vi.fn(() => contactsQuery),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "contact-1",
            name: "Buyer Jane",
            company: "Glow Co",
            stage: "pitched",
          },
        ],
        error: null,
      }),
    };
    setDbFactories({ contacts: () => contactsQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/contacts`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        contacts: [
          {
            id: "contact-1",
            name: "Buyer Jane",
            company: "Glow Co",
            stage: "pitched",
          },
        ],
      });
      expect(contactsQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(contactsQuery.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    });
  });

  it("creates an interaction and updates the contact timestamp", async () => {
    const interactionQuery = {
      insert: vi.fn(() => interactionQuery),
      select: vi.fn(() => interactionQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "interaction-1",
          contact_id: "contact-1",
          user_id: "user-1",
          type: "email",
          summary: "Sent line sheet",
        },
        error: null,
      }),
    };
    const contactsQuery = {
      update: vi.fn(() => contactsQuery),
      eq: vi.fn(() => contactsQuery),
    };
    contactsQuery.eq
      .mockImplementationOnce(() => contactsQuery)
      .mockResolvedValueOnce({ error: null });
    setDbFactories({
      interactions: () => interactionQuery,
      contacts: () => contactsQuery,
    });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/contacts/contact-1/interactions`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email", summary: "Sent line sheet" }),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        interaction: {
          id: "interaction-1",
          contact_id: "contact-1",
          user_id: "user-1",
          type: "email",
          summary: "Sent line sheet",
        },
      });
      expect(interactionQuery.insert).toHaveBeenCalledWith({
        contact_id: "contact-1",
        user_id: "user-1",
        type: "email",
        summary: "Sent line sheet",
      });
      expect(contactsQuery.update).toHaveBeenCalledWith({
        last_contacted_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(contactsQuery.eq).toHaveBeenNthCalledWith(1, "id", "contact-1");
      expect(contactsQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    });
  });

  it("blocks templates access for free-tier users", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/templates`, { headers: authHeaders() });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "gmail requires a Professional plan. Upgrade to unlock this feature.",
        upgrade: true,
      });
    });
  });

  it("creates a template with default category and subject", async () => {
    mocks.billing.getUserTier.mockResolvedValue("professional");

    const insertQuery = {
      insert: vi.fn(() => insertQuery),
      select: vi.fn(() => insertQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "template-1",
          name: "Buyer Follow-Up",
          category: "general",
          subject: "",
          body: "Checking in after our meeting",
          created_at: "2026-03-17T08:00:00.000Z",
          updated_at: "2026-03-17T08:00:00.000Z",
        },
        error: null,
      }),
    };
    setDbFactories({ email_templates: () => insertQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/templates`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Buyer Follow-Up", body: "Checking in after our meeting" }),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        template: {
          id: "template-1",
          name: "Buyer Follow-Up",
          category: "general",
          subject: "",
          body: "Checking in after our meeting",
          created_at: "2026-03-17T08:00:00.000Z",
          updated_at: "2026-03-17T08:00:00.000Z",
        },
      });
      expect(insertQuery.insert).toHaveBeenCalledWith({
        user_id: "user-1",
        name: "Buyer Follow-Up",
        category: "general",
        subject: "",
        body: "Checking in after our meeting",
      });
    });
  });

  it("returns the unread web notification count", async () => {
    const unreadQuery = {
      select: vi.fn(() => unreadQuery),
      eq: vi.fn(() => unreadQuery),
      in: vi.fn(() => unreadQuery),
    };
    unreadQuery.eq
      .mockImplementationOnce(() => unreadQuery)
      .mockResolvedValueOnce({ count: 3, error: null });
    setDbFactories({ notifications: () => unreadQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/notifications/unread-count`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ count: 3 });
      expect(unreadQuery.eq).toHaveBeenNthCalledWith(1, "read", false);
      expect(unreadQuery.in).toHaveBeenCalledWith("channel", ["web", "both"]);
      expect(unreadQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    });
  });

  it("marks a notification as read for the authenticated user", async () => {
    const updateQuery = {
      update: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
    };
    updateQuery.eq
      .mockImplementationOnce(() => updateQuery)
      .mockResolvedValueOnce({ error: null });
    setDbFactories({ notifications: () => updateQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/notifications/notif-1/read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(updateQuery.update).toHaveBeenCalledWith({ read: true });
      expect(updateQuery.eq).toHaveBeenNthCalledWith(1, "id", "notif-1");
      expect(updateQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    });
  });

  it("blocks analytics access for free-tier users", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/analytics`, { headers: authHeaders() });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "proactiveAgent requires a Professional plan. Upgrade to unlock this feature.",
        upgrade: true,
      });
    });
  });

  it("returns aggregated analytics for a professional user", async () => {
    mocks.billing.getUserTier.mockResolvedValue("professional");

    const totalMessagesQuery = {
      select: vi.fn(() => totalMessagesQuery),
      eq: vi.fn(() => totalMessagesQuery),
    };
    totalMessagesQuery.eq
      .mockImplementationOnce(() => totalMessagesQuery)
      .mockResolvedValueOnce({ count: 12 });

    const todayMessagesQuery = {
      select: vi.fn(() => todayMessagesQuery),
      eq: vi.fn(() => todayMessagesQuery),
      gte: vi.fn().mockResolvedValue({ count: 3 }),
    };
    todayMessagesQuery.eq
      .mockImplementationOnce(() => todayMessagesQuery)
      .mockImplementationOnce(() => todayMessagesQuery);

    const weekMessagesQuery = {
      select: vi.fn(() => weekMessagesQuery),
      eq: vi.fn(() => weekMessagesQuery),
      gte: vi.fn().mockResolvedValue({ count: 8 }),
    };
    weekMessagesQuery.eq
      .mockImplementationOnce(() => weekMessagesQuery)
      .mockImplementationOnce(() => weekMessagesQuery);

    const dailyCounts = [1, 0, 2, 0, 1, 3, 4];
    const dailyQueries = dailyCounts.map((count) => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        lt: vi.fn().mockResolvedValue({ count }),
      };
      query.eq
        .mockImplementationOnce(() => query)
        .mockImplementationOnce(() => query);
      return query;
    });

    const messagesFactory = vi.fn()
      .mockImplementationOnce(() => totalMessagesQuery)
      .mockImplementationOnce(() => todayMessagesQuery)
      .mockImplementationOnce(() => weekMessagesQuery);
    dailyQueries.forEach((query) => {
      messagesFactory.mockImplementationOnce(() => query);
    });

    const tasksQuery = {
      select: vi.fn(() => tasksQuery),
      eq: vi.fn().mockResolvedValue({
        data: [
          { done: true, priority: "high" },
          { done: false, priority: "medium" },
          { done: false, priority: "low" },
        ],
      }),
    };
    const templatesQuery = {
      select: vi.fn(() => templatesQuery),
      eq: vi.fn().mockResolvedValue({ count: 2 }),
    };
    const notificationsQuery = {
      select: vi.fn(() => notificationsQuery),
      eq: vi.fn().mockResolvedValue({
        data: [
          { type: "briefing", read: false },
          { type: "nudge", read: true },
          { type: "briefing", read: false },
        ],
      }),
    };

    setDbFactories({
      messages: messagesFactory,
      tasks: () => tasksQuery,
      email_templates: () => templatesQuery,
      notifications: () => notificationsQuery,
    });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/analytics`, { headers: authHeaders() });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.messages.total).toBe(12);
      expect(body.messages.today).toBe(3);
      expect(body.messages.week).toBe(8);
      expect(body.messages.byDay).toHaveLength(7);
      expect(body.messages.byDay.map((day) => day.count)).toEqual(dailyCounts);
      expect(body.tasks).toEqual({
        total: 3,
        completed: 1,
        pending: 2,
        byPriority: { high: 1, medium: 1, low: 1 },
      });
      expect(body.templates).toBe(2);
      expect(body.notifications).toEqual({
        total: 3,
        unread: 2,
        byType: { briefing: 2, nudge: 1 },
      });
      expect(messagesFactory).toHaveBeenCalledTimes(10);
    });
  });

  it("lists messages for a free-tier user with the history cutoff applied", async () => {
    const listQuery = {
      select: vi.fn(() => listQuery),
      eq: vi.fn(() => listQuery),
      order: vi.fn(() => listQuery),
      limit: vi.fn(() => listQuery),
      gte: vi.fn().mockResolvedValue({
        data: [
          {
            id: "msg-1",
            role: "assistant",
            content: "Welcome back!",
            created_at: "2026-03-17T08:00:00.000Z",
          },
        ],
        error: null,
      }),
    };
    setDbFactories({ messages: () => listQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/messages`, { headers: authHeaders() });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        messages: [
          {
            id: "msg-1",
            role: "assistant",
            content: "Welcome back!",
            created_at: "2026-03-17T08:00:00.000Z",
          },
        ],
      });
      expect(listQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(listQuery.order).toHaveBeenCalledWith("created_at");
      expect(listQuery.limit).toHaveBeenCalledWith(50);
      expect(listQuery.gte).toHaveBeenCalledWith("created_at", expect.any(String));
    });
  });

  it("creates a message for the authenticated user", async () => {
    const insertQuery = {
      insert: vi.fn(() => insertQuery),
      select: vi.fn(() => insertQuery),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "msg-2",
          role: "user",
          content: "Need a buyer follow-up draft",
          created_at: "2026-03-17T09:00:00.000Z",
        },
        error: null,
      }),
    };
    setDbFactories({ messages: () => insertQuery });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/messages`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: "Need a buyer follow-up draft" }),
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        message: {
          id: "msg-2",
          role: "user",
          content: "Need a buyer follow-up draft",
          created_at: "2026-03-17T09:00:00.000Z",
        },
      });
      expect(insertQuery.insert).toHaveBeenCalledWith({
        user_id: "user-1",
        role: "user",
        content: "Need a buyer follow-up draft",
      });
    });
  });

  it("returns the daily usage limit error before calling the chat provider", async () => {
    mocks.billing.checkUsageLimit.mockResolvedValue({ allowed: false, limit: 20, remaining: 0 });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
      });

      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({
        error: "Daily message limit reached (20/day). Upgrade to Professional for 100 messages/day.",
        upgrade: true,
        usage: { allowed: false, limit: 20, remaining: 0 },
      });
      expect(mocks.billing.checkUsageLimit).toHaveBeenCalledWith("user-1", "free");
    });
  });

  it("blocks agent briefing for free-tier users", async () => {
    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/agent/briefing`, {
        method: "POST",
        headers: authHeaders(),
      });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "proactiveAgent requires a Professional plan. Upgrade to unlock this feature.",
        upgrade: true,
      });
    });
  });

  it("returns a generated daily briefing for a professional user", async () => {
    mocks.billing.getUserTier.mockResolvedValue("professional");
    mocks.agent.generateDailyBriefing.mockResolvedValue({
      id: "notif-1",
      type: "briefing",
      title: "Today",
    });

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/agent/briefing`, {
        method: "POST",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        notification: {
          id: "notif-1",
          type: "briefing",
          title: "Today",
        },
      });
      expect(mocks.agent.generateDailyBriefing).toHaveBeenCalledWith("user-1");
    });
  });

  it("returns an agent error when nudges generation fails", async () => {
    mocks.billing.getUserTier.mockResolvedValue("professional");
    mocks.agent.detectFollowUpNudges.mockRejectedValue(new Error("Nudge failed."));

    await withServer(async (baseUrl) => {
      const res = await realFetch(`${baseUrl}/api/agent/nudges`, {
        method: "POST",
        headers: authHeaders(),
      });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Nudge failed." });
      expect(mocks.agent.detectFollowUpNudges).toHaveBeenCalledWith("user-1");
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