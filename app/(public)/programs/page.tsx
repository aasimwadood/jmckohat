import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, Award, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Academic Programs" };

export default async function ProgramsPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: programs }] = await Promise.all([
    supabase.from("program_categories").select("*").order("display_order"),
    supabase.from("program_details").select("*").order("display_order"),
  ]);

  if (!categories || categories.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-white">Academic Programs</h1>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-gray-500">Program information is not available yet.</p>
        </div>
      </div>
    );
  }

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Academic Programs</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Explore our comprehensive range of postgraduate programs designed to advance your academic and
            professional career.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue={categories[0]?.id} className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {(programs ?? [])
                    .filter((program) => program.category_id === category.id)
                    .map((program) => (
                      <Card key={program.id} className="transition-all duration-300 hover:shadow-xl">
                        <CardContent className="p-6">
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="mb-2 text-gray-900">{program.name}</h3>
                              <Badge variant="secondary" className="mb-3">
                                {categoryNames.get(program.category_id ?? "") ?? category.name}
                              </Badge>
                            </div>
                            <BookOpen className="h-8 w-8 text-blue-600" />
                          </div>

                          <div className="mb-6 space-y-3">
                            {program.duration && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span>Duration: {program.duration}</span>
                              </div>
                            )}
                            {program.credit_hours && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Award className="h-4 w-4 text-blue-600" />
                                <span>{program.credit_hours} Credit Hours</span>
                              </div>
                            )}
                            {program.eligibility && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <Calendar className="mt-0.5 h-4 w-4 text-blue-600" />
                                <span>Eligibility: {program.eligibility}</span>
                              </div>
                            )}
                          </div>

                          {program.specializations && (
                            <div className="mb-6">
                              <h4 className="mb-2 text-sm text-gray-900">Specializations:</h4>
                              <ul className="space-y-1">
                                {program.specializations.split(",").map((spec) => (
                                  <li key={spec} className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                    {spec.trim()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Link href="/how-to-apply" className="flex-1">
                              <Button className="w-full">Apply Now</Button>
                            </Link>
                            <Link href="/requirements">
                              <Button variant="outline">Requirements</Button>
                            </Link>
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
