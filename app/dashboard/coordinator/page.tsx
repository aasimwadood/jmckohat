import { Calendar, Clock, Users, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findSchedulingConflicts } from "@/lib/services/scheduling-conflicts";

export default async function CoordinatorOverviewPage() {
  const profile = await requireRole("coordinator");
  const supabase = await createClient();

  const { data: entries } = await supabase.from("timetable_entries").select("*");
  const facultyIds = new Set((entries ?? []).map((e) => e.faculty_profile_id).filter(Boolean));
  const conflicts = findSchedulingConflicts(entries ?? []);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
        <p className="text-gray-600">Academic Logistics &amp; Coordination — {profile.fullName}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Stat label="Active Timetable Entries" value={(entries ?? []).length} icon={Calendar} color="text-blue-600" />
        <Stat label="Total Classes" value={(entries ?? []).length} icon={Clock} color="text-green-600" />
        <Stat label="Faculty Coordinated" value={facultyIds.size} icon={Users} color="text-purple-600" />
        <Stat label="Scheduling Conflicts" value={conflicts.length} icon={AlertCircle} color="text-red-600" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Icon className={`mb-4 h-10 w-10 ${color}`} />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
