// @vitest-environment node
import crypto from "crypto";
import { verifySlackRequest } from "./slack.js";

function signRequest(body, timestamp, secret) {
  return "v0=" + crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex");
}

describe("verifySlackRequest", () => {
  const originalSecret = process.env.SLACK_SIGNING_SECRET;

  beforeEach(() => {
    process.env.SLACK_SIGNING_SECRET = "test-signing-secret";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.SLACK_SIGNING_SECRET;
    else process.env.SLACK_SIGNING_SECRET = originalSecret;
  });

  it("accepts a correctly signed request", () => {
    const rawBody = "token=abc&text=hello";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signRequest(rawBody, timestamp, process.env.SLACK_SIGNING_SECRET);

    const req = {
      rawBody,
      headers: {
        "x-slack-request-timestamp": timestamp,
        "x-slack-signature": signature,
      },
    };

    expect(verifySlackRequest(req)).toBe(true);
  });

  it("returns false for malformed or mismatched signatures instead of throwing", () => {
    const req = {
      rawBody: "token=abc",
      headers: {
        "x-slack-request-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-slack-signature": "v0=short",
      },
    };

    expect(() => verifySlackRequest(req)).not.toThrow();
    expect(verifySlackRequest(req)).toBe(false);
  });
});