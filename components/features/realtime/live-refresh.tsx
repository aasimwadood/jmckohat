"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type RealtimeTable = keyof Database["public"]["Tables"];

/**
 * Drop this into any Server Component page whose data multiple roles watch
 * concurrently (an admissions queue, an FYP group, a timetable). It has no
 * UI of its own — on any INSERT/UPDATE/DELETE to the given table (already
 * scoped by RLS, so only rows this viewer could see anyway trigger it), it
 * calls router.refresh() to re-run the page's Server Component data fetch.
 * `filter` is a PostgREST filter string (e.g. "department_id=eq.<uuid>")
 * to avoid refreshing on changes the current view doesn't care about.
 */
export function LiveRefresh({ table, filter }: { table: RealtimeTable; filter?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let cleanup = () => {};

    // Realtime's postgres_changes filtering is evaluated server-side against
    // this socket's own JWT via RLS — the browser client's ordinary auth
    // session (cookie-based, used for every other request) is NOT
    // automatically forwarded to the realtime connection. Without this
    // explicit setAuth call, .subscribe() reports SUBSCRIBED successfully
    // but the connection is effectively anonymous, so RLS silently filters
    // out every row and no event is ever delivered — found live-verifying
    // the Fee Management feature: the channel subscribed fine, the DB write
    // was correct, but no browser tab ever refreshed.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);

      const channel = supabase
        .channel(`live-refresh-${table}-${filter ?? "all"}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
          () => router.refresh(),
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [table, filter, router]);

  return null;
}
