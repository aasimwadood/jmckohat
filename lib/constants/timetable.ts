export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const TIME_SLOTS = [
  { start: "08:00", end: "09:00" },
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
] as const;

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** An entry is placed by its start time falling within a slot, matching the legacy grid (not by spanning the entry's actual duration). */
export function entryStartsInSlot(entryStartTime: string, slot: { start: string; end: string }): boolean {
  const t = toMinutes(entryStartTime.slice(0, 5));
  return t >= toMinutes(slot.start) && t < toMinutes(slot.end);
}
