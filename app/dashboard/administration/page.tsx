import { requireRole } from "@/lib/auth/session";

export default async function AdministrationOverviewPage() {
  const profile = await requireRole("administration");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome, {profile.fullName}</h1>
      <p className="mt-1 text-gray-600">Administration dashboard — module migration in progress (Phase 8).</p>
    </div>
  );
}
