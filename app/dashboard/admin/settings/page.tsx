import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SiteSettingsForm } from "./site-settings-form";

const SETTINGS_KEYS = [
  { key: "InstitutionName", label: "Institution Name" },
  { key: "ContactEmail", label: "Contact Email" },
  { key: "AboutUs", label: "About Us (homepage)" },
  { key: "WelcomeToOurInstitution", label: "Homepage Welcome Message" },
];

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", SETTINGS_KEYS.map((s) => s.key));
  const values = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <SiteSettingsForm fields={SETTINGS_KEYS} values={values} />
      </CardContent>
    </Card>
  );
}
