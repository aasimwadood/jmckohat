import { Bell, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateDepartmentAnnouncementDialog } from "./create-announcement-dialog";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function DepartmentAnnouncementsPage() {
  const profile = await requireRole("department");
  const supabase = await createClient();

  const { data: announcements } = profile.departmentId
    ? await supabase
        .from("announcements")
        .select("*")
        .eq("department_id", profile.departmentId)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <Card>
      {profile.departmentId && <LiveRefresh table="announcements" filter={`department_id=eq.${profile.departmentId}`} />}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Department Announcements</CardTitle>
          <CreateDepartmentAnnouncementDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(announcements ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <h3 className="text-gray-900">{announcement.title}</h3>
              <p className="mb-2 text-sm text-gray-600">{announcement.body}</p>
              <p className="flex items-center text-xs text-gray-500">
                <Calendar className="mr-1 h-3 w-3" />
                {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : "Draft"}
              </p>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div className="py-8 text-center text-gray-500">
              <Bell className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>No department announcements found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
