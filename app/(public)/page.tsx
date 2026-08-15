import { redirect } from "next/navigation";

// Multi-college public site (0042/0043): the real implementation now
// lives at app/college/[slug]/page.tsx — see docs/MIGRATION_PLAN.md §11's
// Part 1 plan. This bare route stays as a redirect to GPGC Kohat's own
// canonical page so existing links/bookmarks keep working.
export default function HomePage() {
  redirect("/college/gpgc-kohat");
}
