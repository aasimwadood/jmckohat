import { FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrl } from "@/lib/supabase/storage";

export default async function StudentMaterialsPage() {
  const profile = await requireRole("student");
  const supabase = await createClient();

  const courseIds: string[] = [];
  if (profile.currentSemesterId) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_profile_id", profile.id)
      .eq("semester_id", profile.currentSemesterId);
    courseIds.push(...(enrollments ?? []).map((e) => e.course_id));
  }

  const [{ data: materials }, { data: courses }] = await Promise.all([
    courseIds.length > 0
      ? supabase.from("course_materials").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
  ]);

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));
  const materialsByCourse = new Map<string, typeof materials>();
  for (const material of materials ?? []) {
    const list = materialsByCourse.get(material.course_id) ?? [];
    list.push(material);
    materialsByCourse.set(material.course_id, list);
  }

  const downloadUrls = new Map<string, string | null>();
  for (const material of materials ?? []) {
    downloadUrls.set(material.id, await getSignedUrl("course-materials", material.file_path));
  }

  const courseEntries = [...materialsByCourse.entries()];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Materials</CardTitle>
      </CardHeader>
      <CardContent>
        {courseEntries.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No materials available for your courses.</div>
        ) : (
          <Tabs defaultValue={courseEntries[0]?.[0]}>
            <TabsList className="flex h-auto flex-wrap">
              {courseEntries.map(([courseId]) => (
                <TabsTrigger key={courseId} value={courseId}>
                  {courseLabels.get(courseId) ?? courseId}
                </TabsTrigger>
              ))}
            </TabsList>
            {courseEntries.map(([courseId, items]) => (
              <TabsContent key={courseId} value={courseId} className="mt-4 space-y-3">
                {items && items.length > 0 ? (
                  items.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-semibold text-gray-900">{material.title}</p>
                          <p className="text-sm text-gray-500">
                            {material.type} · Uploaded {new Date(material.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {downloadUrls.get(material.id) && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={downloadUrls.get(material.id)!} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-1 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border bg-gray-50 py-6 text-center text-gray-500">
                    No materials uploaded for this course yet.
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
