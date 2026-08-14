import { Bell, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreateInstitutionAnnouncementDialog } from "./create-announcement-dialog";
import { LiveRefresh } from "@/components/features/realtime/live-refresh";

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Card>
      <LiveRefresh table="announcements" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Announcements</CardTitle>
          <CreateInstitutionAnnouncementDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(announcements ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                <Badge variant={announcement.scope === "institution" ? "default" : "outline"} className="capitalize">
                  {announcement.scope}
                </Badge>
              </div>
              <p className="mb-2 text-gray-600">{announcement.body}</p>
              <p className="flex items-center text-xs text-gray-400">
                <Calendar className="mr-1 h-3 w-3" />
                {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : "Draft"}
              </p>
            </div>
          ))}
          {(!announcements || announcements.length === 0) && (
            <div className="py-12 text-center text-gray-500">
              <Bell className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p>No announcements found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
