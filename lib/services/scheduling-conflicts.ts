import type { Database } from "@/types/database.types";

type TimetableEntry = Database["public"]["Tables"]["timetable_entries"]["Row"];

export type SchedulingConflict = {
  type: "faculty" | "room";
  key: string;
  dayOfWeek: number;
  entries: TimetableEntry[];
};

function overlaps(a: TimetableEntry, b: TimetableEntry): boolean {
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

/**
 * Derives real scheduling conflicts from timetable_entries — the same
 * faculty member or the same room double-booked on the same day with
 * overlapping times. Computed on read, not stored: the legacy dashboard
 * showed 3 hardcoded fake conflicts with no detection logic behind them.
 */
export function findSchedulingConflicts(entries: TimetableEntry[]): SchedulingConflict[] {
  const conflicts: SchedulingConflict[] = [];

  const byDay = new Map<number, TimetableEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.day_of_week) ?? [];
    list.push(entry);
    byDay.set(entry.day_of_week, list);
  }

  for (const [day, dayEntries] of byDay) {
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        const a = dayEntries[i]!;
        const b = dayEntries[j]!;
        if (!overlaps(a, b)) continue;

        if (a.faculty_profile_id && a.faculty_profile_id === b.faculty_profile_id) {
          conflicts.push({ type: "faculty", key: a.faculty_profile_id, dayOfWeek: day, entries: [a, b] });
        }
        if (a.room && a.room === b.room) {
          conflicts.push({ type: "room", key: a.room, dayOfWeek: day, entries: [a, b] });
        }
      }
    }
  }

  return conflicts;
}
