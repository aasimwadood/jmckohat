import { redirect } from "next/navigation";

// See app/(public)/page.tsx for why this is a redirect.
export default function ProgramsPage() {
  redirect("/college/gpgc-kohat/programs");
}
