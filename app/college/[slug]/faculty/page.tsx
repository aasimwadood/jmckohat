import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail, Phone, Award, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getCollegeBySlug } from "@/lib/services/colleges";

export const metadata: Metadata = { title: "Faculty" };

// Higher academic rank first within each tab. Checked most-specific first
// since "Associate Professor" and "Assistant Professor" both contain the
// substring "Professor" — a plain .includes("Professor") would misrank them
// as equal to (or ahead of) a full Professor.
function rankOf(designation: string | null): number {
  if (!designation) return 5;
  if (designation.includes("Associate Professor")) return 2;
  if (designation.includes("Assistant Professor")) return 3;
  if (designation.includes("Professor")) return 1;
  if (designation.includes("Lecturer")) return 4;
  return 5;
}

export default async function FacultyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  // Personal mobile numbers are only visible to signed-in users — the anon
  // (public) Postgres role is column-privilege-restricted from `phone`
  // entirely (0033_faculty_directory_phone_privacy.sql), so `select("*")`
  // would error for a signed-out visitor. Two separate typed queries (one
  // per branch) rather than a single call with a ternary column string,
  // since the query builder can't infer a return type from a dynamic
  // column list.
  const [{ data: categories }, { data: members }] = await Promise.all([
    supabase.from("faculty_categories").select("*").eq("college_id", college.id).order("name", { ascending: true }),
    profile
      ? supabase.from("faculty_directory").select("*").eq("college_id", college.id).order("display_order")
      : supabase
          .from("faculty_directory")
          .select(
            "id, category_id, department_id, name, designation, qualification, photo_path, specialization, email, publications_count, display_order",
          )
          .eq("college_id", college.id)
          .order("display_order")
          .then((res) => ({ ...res, data: res.data?.map((m) => ({ ...m, phone: null })) ?? null })),
  ]);

  if (!categories || categories.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-white">Our Faculty</h1>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-gray-500">Faculty information is not available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Our Faculty</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Meet our distinguished faculty members who are experts in their respective fields with extensive
            research experience and academic excellence.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue={categories[0]?.id} className="w-full">
            <TabsList className="mb-8 h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="flex-none rounded-full border border-gray-200 bg-white px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:text-white"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.id} value={cat.id}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {(members ?? [])
                    .filter((f) => f.category_id === cat.id)
                    .sort((a, b) => rankOf(a.designation) - rankOf(b.designation))
                    .map((faculty) => (
                      <Card key={faculty.id} className="transition-all duration-300 hover:shadow-xl">
                        <CardContent className="p-6">
                          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                            <span className="text-2xl text-white">
                              {faculty.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                          </div>

                          <div className="mb-4 text-center">
                            <h3 className="mb-1 text-gray-900">{faculty.name}</h3>
                            {faculty.designation && (
                              <Badge variant="secondary" className="mb-2">
                                {faculty.designation}
                              </Badge>
                            )}
                            <p className="text-sm text-gray-600">{faculty.qualification}</p>
                          </div>

                          <div className="mb-4 space-y-3">
                            {faculty.specialization && (
                              <div className="flex items-start gap-2 text-sm">
                                <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                                <span className="text-gray-600">{faculty.specialization}</span>
                              </div>
                            )}
                            {faculty.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                <span className="break-all text-gray-600">{faculty.email}</span>
                              </div>
                            )}
                            {faculty.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                <span className="text-gray-600">{faculty.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="border-t pt-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Award className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-gray-600">
                                {faculty.publications_count} Publications
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </div>
  );
}
