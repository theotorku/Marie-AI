// @vitest-environment node
import {
  clearOAuthStateCookie,
  consumeOAuthState,
  createOAuthState,
  createOAuthStateCookie,
  resetOAuthStatesForTests,
} from "./oauthState.js";

describe("oauthState", () => {
  const originalAppUrl = process.env.APP_URL;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    resetOAuthStatesForTests();
    delete process.env.APP_URL;
    process.env.JWT_SECRET = "oauth-state-test-secret";
  });

  afterAll(() => {
    if (originalAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = originalAppUrl;

    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  it("binds a signed state token to the initiating user", () => {
    const state = createOAuthState("google", "user-123");
    const req = { headers: { cookie: createOAuthStateCookie("google", state) } };

    expect(consumeOAuthState("google", req, state)).toEqual({ ok: true, userId: "user-123" });
  });

  it("rejects callback state when the browser cookie does not match", () => {
    const state = createOAuthState("slack", "user-456");
    const req = { headers: { cookie: "marie_slack_oauth_state=other-state" } };

    expect(consumeOAuthState("slack", req, state)).toEqual({ ok: false, error: "Invalid OAuth state." });
  });

  it("rejects tampered or wrong-provider state tokens", () => {
    const slackState = createOAuthState("slack", "user-789");
    const wrongProviderReq = { headers: { cookie: createOAuthStateCookie("google", slackState) } };
    const slackReq = { headers: { cookie: createOAuthStateCookie("slack", slackState) } };

    expect(consumeOAuthState("google", wrongProviderReq, slackState)).toEqual({ ok: false, error: "Invalid or expired OAuth state." });
    expect(consumeOAuthState("slack", slackReq, `${slackState}tampered`)).toEqual({ ok: false, error: "Invalid OAuth state." });
  });

  it("creates and clears provider-scoped cookies", () => {
    const cookie = createOAuthStateCookie("google", "abc123");
    const cleared = clearOAuthStateCookie("google");

    expect(cookie).toContain("marie_google_oauth_state=abc123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/api/google/callback");
    expect(cleared).toContain("Max-Age=0");
    expect(cleared).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});