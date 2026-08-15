import { redirect } from "next/navigation";

// See app/(public)/page.tsx for why this is a redirect.
export default function DownloadPage() {
  redirect("/college/gpgc-kohat/downloads");
}
