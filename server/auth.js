import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db.js";

const SALT_ROUNDS = 10;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set in .env");
  return secret;
}

export async function registerUser(email, password, name) {
  const db = getDb();

  // Check if user exists
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: user, error } = await db
    .from("users")
    .insert({ email, name, password_hash: passwordHash })
    .select("id, email, name")
    .single();

  if (error) return { error: "Failed to create account." };

  const token = jwt.sign({ id: user.id, email: user.email }, getSecret(), { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function loginUser(email, password) {
  const db = getDb();

  const { data: user } = await db
    .from("users")
    .select("id, email, name, password_hash")
    .eq("email", email)
    .single();

  if (!user) return { error: "Invalid email or password." };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { error: "Invalid email or password." };

  const token = jwt.sign({ id: user.id, email: user.email }, getSecret(), { expiresIn: "7d" });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.user = jwt.verify(token, getSecret());
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
