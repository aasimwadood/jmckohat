import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function HedReportsPage() {
  await requireRole("hed_admin");
  const supabase = await createClient();

  const [{ data: directorates }, { data: jmcs }, { data: colleges }, { data: collegeTypes }] = await Promise.all([
    supabase.from("directorates").select("id, name").order("name"),
    supabase.from("jmcs").select("id, directorate_id, name").order("name"),
    supabase.from("colleges").select("id, jmc_id, college_type_id"),
    supabase.from("college_types").select("id, code"),
  ]);

  const typeCodeById = new Map((collegeTypes ?? []).map((t) => [t.id, t.code]));
  const jmcById = new Map((jmcs ?? []).map((j) => [j.id, j]));

  // Directorate-wise: JMC count + college count, rolled up through jmcs.
  const jmcCountByDirectorate = new Map<string, number>();
  const collegeCountByDirectorate = new Map<string, number>();
  for (const j of jmcs ?? []) {
    jmcCountByDirectorate.set(j.directorate_id, (jmcCountByDirectorate.get(j.directorate_id) ?? 0) + 1);
  }
  for (const c of colleges ?? []) {
    const jmc = jmcById.get(c.jmc_id);
    if (!jmc) continue;
    collegeCountByDirectorate.set(jmc.directorate_id, (collegeCountByDirectorate.get(jmc.directorate_id) ?? 0) + 1);
  }

  // JMC-wise: college count, GPGC/GDC split.
  const collegeCountByJmc = new Map<string, { total: number; gpgc: number; gdc: number }>();
  for (const c of colleges ?? []) {
    const entry = collegeCountByJmc.get(c.jmc_id) ?? { total: 0, gpgc: 0, gdc: 0 };
    entry.total += 1;
    const typeCode = typeCodeById.get(c.college_type_id);
    if (typeCode === "GPGC") entry.gpgc += 1;
    if (typeCode === "GDC") entry.gdc += 1;
    collegeCountByJmc.set(c.jmc_id, entry);
  }

  const totalGpgc = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GPGC").length;
  const totalGdc = (colleges ?? []).filter((c) => typeCodeById.get(c.college_type_id) === "GDC").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GPGC vs GDC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{colleges?.length ?? 0}</p>
              <p className="text-sm text-gray-500">Total Colleges</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalGpgc}</p>
              <p className="text-sm text-gray-500">GPGCs</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalGdc}</p>
              <p className="text-sm text-gray-500">GDCs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directorate-wise</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Directorate</TableHead>
                <TableHead>JMCs</TableHead>
                <TableHead>Colleges</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(directorates ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>{jmcCountByDirectorate.get(d.id) ?? 0}</TableCell>
                  <TableCell>{collegeCountByDirectorate.get(d.id) ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>JMC-wise</CardTitle>
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
    </div>
  );
}
