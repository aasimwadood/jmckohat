import { requireRole } from "@/lib/auth/session";

export default async function ControllerOverviewPage() {
  const profile = await requireRole("controller");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Welcome, {profile.fullName}</h1>
      <p className="mt-1 text-gray-600">
        Controller of Examinations dashboard — module migration in progress (Phase 8).
      </p>
    </div>
  );
}
