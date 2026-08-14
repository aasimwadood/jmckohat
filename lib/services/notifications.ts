import { createClient } from "@/lib/supabase/server";

export async function getInitialNotifications(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}
