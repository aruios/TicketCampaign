import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Session-aware client for Server Components/Actions — reads/writes the auth
// cookie so `supabase.auth.getUser()` reflects the signed-in admin. Uses the
// publishable key + RLS, unlike lib/supabase/server.ts's service-role client
// which intentionally bypasses RLS for admin data operations.
export const createClient = (cookieStore: Awaited<ReturnType<typeof cookies>>) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore since
          // middleware.ts refreshes the session on every request.
        }
      },
    },
  });
};
