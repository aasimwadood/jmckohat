import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCollegeBySlug } from "@/lib/services/colleges";
import { DownloadBrowser } from "@/app/(public)/downloads/download-browser";

export const metadata: Metadata = { title: "Downloads" };

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function DownloadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const supabase = await createClient();

  const [{ data: categories }, { data: downloads }] = await Promise.all([
    supabase.from("download_categories").select("id, name").eq("college_id", college.id).order("display_order"),
    supabase.from("downloads").select("*").eq("college_id", college.id).order("uploaded_at", { ascending: false }),
  ]);

  const documents = (downloads ?? []).map((d) => ({
    id: d.id,
    category_id: d.category_id,
    title: d.title,
    uploaded_at: d.uploaded_at,
    url: supabase.storage.from("public-assets").getPublicUrl(d.file_path).data.publicUrl,
    sizeLabel: formatSize(d.file_size_bytes),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Downloads</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Access important forms, documents, and resources. All files are available for download.
          </p>
        </div>
      </section>

      {categories && categories.length > 0 ? (
        <DownloadBrowser categories={categories} documents={documents} />
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-gray-500">No downloads have been published yet.</p>
        </div>
      )}

      <section className="bg-blue-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-blue-200">
            <CardContent className="p-8">
              <h3 className="mb-4 text-gray-900">Important Notice</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>All documents are in PDF format. Make sure you have a PDF reader installed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>For admission forms, ensure all fields are filled correctly before submission.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>Fee challans must be printed and submitted at designated bank branches.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-blue-600">•</span>
                  <span>Always check the document date to ensure you&apos;re using the latest version.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
