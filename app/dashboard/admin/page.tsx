import { Users, BookOpen, Building2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const [{ count: userCount }, { count: courseCount }, { count: departmentCount }, { data: recentActivity }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("departments").select("id", { count: "exact", head: true }),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

  const { data: roleCounts } = await supabase.from("profiles").select("role");
  const byRole = new Map<string, number>();
  for (const r of roleCounts ?? []) {
    byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile.fullName}!</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Stat label="Total Users" value={userCount ?? 0} icon={Users} />
          <Stat label="Total Courses" value={courseCount ?? 0} icon={BookOpen} />
          <Stat label="Departments" value={departmentCount ?? 0} icon={Building2} />
          <Stat label="Students" value={byRole.get("student") ?? 0} icon={Activity} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[...byRole.entries()].map(([role, count]) => (
                <div key={role} className="rounded-lg border p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 capitalize">{role}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(recentActivity ?? []).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="capitalize">{log.action.replace(/_/g, " ")}</span>
                  <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="py-4 text-center text-gray-500">No recent activity recorded.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <Icon className="h-10 w-10 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
}
