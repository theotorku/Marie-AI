import crypto from "crypto";
import jwt from "jsonwebtoken";

const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_TTL_SECONDS = Math.floor(STATE_TTL_MS / 1000);
const COOKIE_NAMES = {
  google: "marie_google_oauth_state",
  slack: "marie_slack_oauth_state",
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set in .env");
  return secret;
}

function getCookieName(provider) {
  const cookieName = COOKIE_NAMES[provider];
  if (!cookieName) throw new Error(`Unsupported OAuth provider: ${provider}`);
  return cookieName;
}

function getCookiePath(provider) {
  return provider === "google" ? "/api/google/callback" : "/api/slack/callback";
}

function shouldUseSecureCookies() {
  return (process.env.APP_URL || "").startsWith("https://");
}

function serializeCookie(name, value, { maxAgeSeconds, path }) {
  const parts = [`${name}=${value}`, "HttpOnly", "SameSite=Lax", `Path=${path}`];
  if (typeof maxAgeSeconds === "number") parts.push(`Max-Age=${maxAgeSeconds}`);
  if (shouldUseSecureCookies()) parts.push("Secure");
  return parts.join("; ");
}

function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(/;\s*/);
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split("=");
    if (cookieName === name) return valueParts.join("=");
  }
  return null;
}

export function createOAuthState(provider, userId) {
  return jwt.sign({
    type: "oauth_state",
    provider,
    userId,
    nonce: crypto.randomBytes(24).toString("base64url"),
  }, getSecret(), {
    expiresIn: STATE_TTL_SECONDS,
  });
}

export function createOAuthStateCookie(provider, state) {
  return serializeCookie(getCookieName(provider), state, {
    maxAgeSeconds: STATE_TTL_SECONDS,
    path: getCookiePath(provider),
  });
}

export function clearOAuthStateCookie(provider) {
  return `${serializeCookie(getCookieName(provider), "", {
    maxAgeSeconds: 0,
    path: getCookiePath(provider),
  })}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function consumeOAuthState(provider, req, state) {
  if (typeof state !== "string" || !state) {
    return { ok: false, error: "Missing or invalid OAuth state." };
  }

  const cookieState = readCookie(req.headers.cookie, getCookieName(provider));
  if (!cookieState || cookieState !== state) {
    return { ok: false, error: "Invalid OAuth state." };
  }

  try {
    const decoded = jwt.verify(state, getSecret());
    if (
      !decoded ||
      typeof decoded !== "object" ||
      decoded.type !== "oauth_state" ||
      decoded.provider !== provider ||
      typeof decoded.userId !== "string" ||
      !decoded.userId
    ) {
      return { ok: false, error: "Invalid or expired OAuth state." };
    }

    return { ok: true, userId: decoded.userId };
  } catch {
    return { ok: false, error: "Invalid or expired OAuth state." };
  }
}

export function resetOAuthStatesForTests() {
  // Stateless implementation: kept for test compatibility.
}