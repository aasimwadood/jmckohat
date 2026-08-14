import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * `server-only` guarantees this module (and therefore the service-role key)
 * can never be pulled into a Client Component bundle — importing it from
 * client code fails the build instead of leaking the key to the browser.
 *
 * Use only for operations that must run with elevated privileges after the
 * caller's role has already been verified server-side, e.g. provisioning a
 * staff account, or Storage operations on a private bucket where the RLS
 * policy already gated the request.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
