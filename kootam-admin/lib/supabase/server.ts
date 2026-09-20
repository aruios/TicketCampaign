import { createClient } from "@supabase/supabase-js";

// Server-only: uses the service_role key, which bypasses Row-Level Security.
// Never import this into a client component. The admin app is the one place
// that's supposed to see every user's data, so this is intentional here.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
