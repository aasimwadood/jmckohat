import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function JmcReportsPage() {
  const profile = await requireRole("jmc_admin");
  const supabase = await createClient();

  if (!profile.jmcId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Your JMC is not configured yet.</CardContent>
      </Card>
    );
  }

  const { data: colleges } = await supabase.from("colleges").select("id, status").eq("jmc_id", profile.jmcId);
  const active = (colleges ?? []).filter((c) => c.status === "active").length;
  const inactive = (colleges ?? []).filter((c) => c.status === "inactive").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>JMC Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{colleges?.length ?? 0}</p>
            <p className="text-sm text-gray-500">Total Colleges</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{active}</p>
            <p className="text-sm text-gray-500">Active</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{inactive}</p>
            <p className="text-sm text-gray-500">Inactive</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
