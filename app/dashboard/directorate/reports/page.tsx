import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DirectorateReportsPage() {
  const profile = await requireRole("directorate_admin");
  const supabase = await createClient();

  if (!profile.directorateId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your directorate is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: jmcs } = await supabase.from("jmcs").select("id, name").eq("directorate_id", profile.directorateId).order("name");
  const jmcIds = (jmcs ?? []).map((j) => j.id);

  const [{ data: colleges }, { data: collegeTypes }] = await Promise.all([
    jmcIds.length > 0
      ? supabase.from("colleges").select("id, jmc_id, college_type_id").in("jmc_id", jmcIds)
      : Promise.resolve({ data: [] }),
    supabase.from("college_types").select("id, code"),
  ]);
  const typeCodeById = new Map((collegeTypes ?? []).map((t) => [t.id, t.code]));

  const collegeCountByJmc = new Map<string, { total: number; gpgc: number; gdc: number }>();
  for (const c of colleges ?? []) {
    const entry = collegeCountByJmc.get(c.jmc_id) ?? { total: 0, gpgc: 0, gdc: 0 };
    entry.total += 1;
    const typeCode = typeCodeById.get(c.college_type_id);
    if (typeCode === "GPGC") entry.gpgc += 1;
    if (typeCode === "GDC") entry.gdc += 1;
    collegeCountByJmc.set(c.jmc_id, entry);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>College-wise Report</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>JMC</TableHead>
              <TableHead>Colleges</TableHead>
              <TableHead>GPGC</TableHead>
              <TableHead>GDC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(jmcs ?? []).map((j) => {
              const entry = collegeCountByJmc.get(j.id) ?? { total: 0, gpgc: 0, gdc: 0 };
              return (
                <TableRow key={j.id}>
                  <TableCell>{j.name}</TableCell>
                  <TableCell>{entry.total}</TableCell>
                  <TableCell>{entry.gpgc}</TableCell>
                  <TableCell>{entry.gdc}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
