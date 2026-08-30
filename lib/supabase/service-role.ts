import { createClient } from "@supabase/supabase-js";

// Bypasses RLS entirely — only for server-to-server contexts with no
// user session (the PayMongo webhook). Never import this from
// anywhere a request could originate from the browser.
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
}
