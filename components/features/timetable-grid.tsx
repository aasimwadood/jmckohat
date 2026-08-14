import { Card, CardContent } from "@/components/ui/card";
import { DAY_NAMES, TIME_SLOTS, entryStartsInSlot } from "@/lib/constants/timetable";

export type TimetableEntryView = {
  id: string;
  dayOfWeek: number; // 0=Monday .. 5=Saturday
  startTime: string;
  endTime: string;
  room: string | null;
  groupName: string | null;
  courseLabel: string;
  facultyName: string | null;
};

export function TimetableGrid({ entries }: { entries: TimetableEntryView[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">No timetable entries published yet.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left text-gray-500">Time</th>
              {DAY_NAMES.map((day) => (
                <th key={day} className="border p-2 text-left text-gray-700">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot.start}>
                <td className="border p-2 whitespace-nowrap text-gray-500">
                  {slot.start} - {slot.end}
                </td>
                {DAY_NAMES.map((_, dayIndex) => {
                  const entry = entries.find(
                    (e) => e.dayOfWeek === dayIndex && entryStartsInSlot(e.startTime, slot),
                  );
                  return (
                    <td key={dayIndex} className="border p-2 align-top">
                      {entry && (
                        <div className="rounded-md bg-blue-50 p-2">
                          <p className="font-medium text-blue-900">{entry.courseLabel}</p>
                          {entry.facultyName && <p className="text-xs text-gray-600">{entry.facultyName}</p>}
                          <p className="text-xs text-gray-500">
                            {entry.room ?? "TBD"}
                            {entry.groupName ? ` · ${entry.groupName}` : ""}
                          </p>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
