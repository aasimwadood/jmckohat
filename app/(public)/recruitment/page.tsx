import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recruitment" };

export default async function RecruitmentListPage() {
  const supabase = await createClient();

  const { data: ads } = await supabase
    .from("recruitment_advertisements")
    .select("id, title, ad_number, closing_date, status, college_id")
    .neq("status", "draft")
    .order("closing_date", { ascending: true });

  const collegeIds = [...new Set((ads ?? []).map((a) => a.college_id))];
  const { data: colleges } = collegeIds.length
    ? await supabase.from("colleges").select("id, name").in("id", collegeIds)
    : { data: [] };
  const collegeNameById = new Map((colleges ?? []).map((c) => [c.id, c.name]));

  const openAds = (ads ?? []).filter((a) => a.status === "applications_open");
  const otherAds = (ads ?? []).filter((a) => a.status !== "applications_open");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Recruitment</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Current job openings across our colleges. Apply online for open positions below.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-12 sm:px-6 lg:px-8">
        {ads && ads.length > 0 ? (
          [...openAds, ...otherAds].map((ad) => (
            <Link key={ad.id} href={`/recruitment/${ad.id}`}>
              <Card className="transition hover:border-blue-400 hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 py-5">
                  <div className="flex items-center gap-4">
                    <Briefcase className="h-8 w-8 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{ad.title}</p>
                      <p className="text-sm text-gray-500">
                        {collegeNameById.get(ad.college_id) ?? ""}
                        {ad.ad_number && ` · Ad #${ad.ad_number}`} · Closes {new Date(ad.closing_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ad.status === "applications_open" ? "default" : "secondary"} className="capitalize">
                    {ad.status.replace(/_/g, " ")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <p className="py-16 text-center text-gray-500">No recruitment advertisements are currently published.</p>
        )}
      </div>
    </div>
  );
}
