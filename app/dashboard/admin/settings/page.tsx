import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { resolveAdminCollegeId } from "@/lib/utils/college-scope";
import { SiteSettingsForm } from "./site-settings-form";

const SETTINGS_KEYS = [
  { key: "InstitutionName", label: "Institution Name" },
  { key: "ContactEmail", label: "Contact Email" },
  { key: "AboutUs", label: "About Us (homepage)" },
  { key: "WelcomeToOurInstitution", label: "Homepage Welcome Message" },
];

export default async function AdminSettingsPage() {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const collegeId = await resolveAdminCollegeId(supabase, profile.collegeId);

  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("college_id", collegeId)
    .in("key", SETTINGS_KEYS.map((s) => s.key));
  const values = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <SiteSettingsForm fields={SETTINGS_KEYS} values={values} collegeId={collegeId} />
      </CardContent>
    </Card>
  );
}
