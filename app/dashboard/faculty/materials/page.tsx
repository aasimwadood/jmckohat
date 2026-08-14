import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { UploadMaterialDialog } from "./upload-material-dialog";
import { DeleteMaterialButton } from "./delete-material-button";

export default async function FacultyMaterialsPage() {
  const profile = await requireRole("faculty");
  const supabase = await createClient();

  const { data: courseFaculty } = await supabase.from("course_faculty").select("course_id").eq("faculty_profile_id", profile.id);
  const courseIds = [...new Set((courseFaculty ?? []).map((c) => c.course_id))];

  const [{ data: courses }, { data: materials }] = await Promise.all([
    courseIds.length > 0 ? supabase.from("courses").select("id, code, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    courseIds.length > 0
      ? supabase.from("course_materials").select("*").in("course_id", courseIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const courseLabels = new Map((courses ?? []).map((c) => [c.id, `${c.code} - ${c.title}`]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Course Materials</CardTitle>
          <UploadMaterialDialog courses={courses ?? []} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(materials ?? []).map((material) => (
              <TableRow key={material.id}>
                <TableCell>{courseLabels.get(material.course_id)}</TableCell>
                <TableCell className="font-medium">{material.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {material.type.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(material.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DeleteMaterialButton materialId={material.id} />
                </TableCell>
              </TableRow>
            ))}
            {(materials ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                  No materials uploaded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
