import { MessageSquare, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function FacultyAnnouncementsPage() {
  const profile = await requireRole("faculty");
  const supabase = await createClient();

  const { data: courseFaculty } = await supabase.from("course_faculty").select("course_id").eq("faculty_profile_id", profile.id);
  const courseIds = [...new Set((courseFaculty ?? []).map((c) => c.course_id))];

  const { data: courses } =
    courseIds.length > 0 ? await supabase.from("courses").select("id, code, title").in("id", courseIds) : { data: [] };

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(30);

  return (
    <Card>
      <LiveRefresh table="announcements" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Announcements</CardTitle>
          <CreateAnnouncementDialog courses={courses ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(announcements ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4 transition-colors hover:bg-gray-50">
              <div className="mb-2 flex items-start justify-between">
                <h4 className="text-lg font-semibold text-gray-900">{announcement.title}</h4>
                <Badge variant={announcement.scope === "institution" ? "default" : "outline"} className="capitalize">
                  {announcement.scope}
                </Badge>
              </div>
              <p className="mb-2 text-gray-600">{announcement.body}</p>
              <div className="flex items-center text-sm text-gray-400">
                <Calendar className="mr-1 h-4 w-4" />
                {new Date(announcement.published_at!).toLocaleDateString()}
              </div>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div className="py-12 text-center text-gray-500">
              <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>No announcements found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
