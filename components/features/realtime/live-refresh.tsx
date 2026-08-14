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
    const channel = supabase
      .channel(`live-refresh-${table}-${filter ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, router]);

  return null;
}
