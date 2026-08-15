import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { getCollegeBySlug } from "@/lib/services/colleges";

export const metadata: Metadata = { title: "Admission Requirements" };

const COLUMNS = [
  { type: "Academic", title: "Academic Requirements" },
  { type: "Test", title: "Test Requirements" },
  { type: "Additional", title: "Additional Requirements" },
] as const;

export default async function RequirementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const supabase = await createClient();

  const [{ data: categories }, { data: requirements }] = await Promise.all([
    supabase.from("program_categories").select("*").eq("college_id", college.id).order("display_order"),
    supabase.from("program_requirements").select("*").eq("college_id", college.id).order("display_order"),
  ]);

  if (!categories || categories.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-white">Admission Requirements</h1>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-gray-500">Requirement information is not available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Admission Requirements</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Review the eligibility criteria and requirements for different postgraduate programs.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue={categories[0]?.id} className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 lg:grid-cols-4">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {COLUMNS.map((column) => {
                    const items = (requirements ?? []).filter(
                      (r) => r.category_id === cat.id && r.requirement_type === column.type,
                    );
                    return (
                      <Card key={column.type} className="transition-all hover:shadow-xl">
                        <CardContent className="p-6">
                          <h3 className="mb-4 text-gray-900">{column.title}</h3>
                          <ul className="space-y-3">
                            {items.map((req) => (
                              <li key={req.id} className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                                <span className="text-sm text-gray-600">{req.requirement}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </div>
  );
}
