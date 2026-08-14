import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed URL for a private-bucket object. Every private bucket's RLS
 * policy (supabase/migrations/0010_storage.sql) already restricts who can
 * reach a given path — this just turns an authorized path into a
 * short-lived downloadable link, it doesn't grant access on its own.
 */
export async function getSignedUrl(bucket: string, path: string, expiresInSeconds = 300) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
