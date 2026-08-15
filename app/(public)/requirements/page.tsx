import { redirect } from "next/navigation";

// See app/(public)/page.tsx for why this is a redirect.
export default function RequirementsPage() {
  redirect("/college/gpgc-kohat/requirements");
}
