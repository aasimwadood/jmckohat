import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Users, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCollegeBySlug } from "@/lib/services/colleges";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();
  const basePath = `/college/${slug}`;

  const supabase = await createClient();

  const [{ data: departments }, { data: programs }, { data: studentCountRows }, { data: facultyMembers }] = await Promise.all([
    supabase.from("departments").select("id, name, description, labs_count, hod_profile_id").eq("college_id", college.id).order("name"),
    supabase.from("programs").select("department_id, name"),
    // profiles has no anon-read policy (it holds real student PII) and never
    // should — this RPC exposes only the aggregate count this page needs.
    // See 0051_public_faculty_and_student_count_fixes.sql.
    supabase.rpc("public_department_student_counts", { p_college_id: college.id }),
    // "Head" and "Faculty" here deliberately come from faculty_directory (the
    // public staff directory), not profiles/hod_profile_id (real login
    // accounts) — this is an informational public page, and the college has
    // real staff on record long before any of them have a system login.
    supabase.from("faculty_directory").select("department_id, name, designation").eq("college_id", college.id).not("department_id", "is", null),
  ]);

  const headNameByDept = new Map<string, string>();
  const facultyCounts = new Map<string, number>();
  for (const member of facultyMembers ?? []) {
    if (!member.department_id) continue;
    facultyCounts.set(member.department_id, (facultyCounts.get(member.department_id) ?? 0) + 1);
    if (member.designation?.includes("Head of Department")) {
      headNameByDept.set(member.department_id, member.name);
    }
  }

  const programsByDepartment = new Map<string, string[]>();
  for (const program of programs ?? []) {
    const list = programsByDepartment.get(program.department_id) ?? [];
    list.push(program.name);
    programsByDepartment.set(program.department_id, list);
  }

  const studentCounts = new Map<string, number>(
    (studentCountRows ?? []).map((row) => [row.department_id, Number(row.student_count)]),
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Our Departments</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Explore our diverse academic departments offering world-class postgraduate programs in various
            disciplines.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {departments && departments.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {departments.map((dept) => (
                <Card key={dept.id} className="transition-all duration-300 hover:shadow-xl">
                  <CardContent className="p-8">
                    <div className="mb-6 flex items-start gap-4">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-2 text-gray-900">{dept.name}</h3>
                        <p className="text-blue-600">
                          Head: {headNameByDept.get(dept.id) ?? "Not yet assigned"}
                        </p>
                      </div>
                    </div>

                    <p className="mb-6 text-gray-600">{dept.description}</p>

                    <div className="mb-6">
                      <h4 className="mb-3 text-gray-900">Programs Offered:</h4>
                      <ul className="space-y-2">
                        {(programsByDepartment.get(dept.id) ?? []).map((programName) => (
                          <li key={programName} className="flex items-center gap-2 text-gray-700">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            {programName}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-blue-50 p-4">
                      <div className="text-center">
                        <Users className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                        <p className="text-gray-900">{studentCounts.get(dept.id) ?? 0}</p>
                        <p className="text-xs text-gray-600">Students</p>
                      </div>
                      <div className="text-center">
                        <Award className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                        <p className="text-gray-900">{facultyCounts.get(dept.id) ?? 0}</p>
                        <p className="text-xs text-gray-600">Faculty</p>
                      </div>
                      <div className="text-center">
                        <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                        <p className="text-gray-900">{dept.labs_count}</p>
                        <p className="text-xs text-gray-600">Labs</p>
                      </div>
                    </div>

                    <Link href={`${basePath}/programs`}>
                      <Button className="w-full">View Programs</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Department information is not available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
