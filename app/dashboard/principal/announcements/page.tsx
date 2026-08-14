import { Bell, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CreatePrincipalAnnouncementDialog } from "./create-announcement-dialog";

export default async function PrincipalAnnouncementsPage() {
  await requireRole("principal");
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("scope", "institution")
    .order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Institution Announcements</CardTitle>
          <CreatePrincipalAnnouncementDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(announcements ?? []).map((announcement) => (
            <div key={announcement.id} className="rounded-lg border p-4">
              <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
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
              <p>No announcements published yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
