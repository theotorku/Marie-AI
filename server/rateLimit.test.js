// @vitest-environment node
import { rateLimit } from "./rateLimit.js";

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("rateLimit", () => {
  it("tracks requests across calls and blocks after the configured limit", () => {
    const limiter = rateLimit({ windowMs: 1000, maxRequests: 2 });
    const req = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
    const next = vi.fn();

    limiter(req, createResponse(), next);
    limiter(req, createResponse(), next);

    const blocked = createResponse();
    limiter(req, blocked, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toEqual({ error: expect.stringContaining("Rate limit exceeded") });
    expect(blocked.headers["X-RateLimit-Limit"]).toBe("2");
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });
});