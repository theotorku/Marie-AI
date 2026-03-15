import { createClient } from "@supabase/supabase-js";

let supabase;

export function getDb() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env");
  }

  supabase = createClient(url, key);
  return supabase;
}
