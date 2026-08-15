import type { Metadata } from "next";
import { Target, Eye, History, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

export const metadata: Metadata = { title: "About Us" };

export default async function AboutPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: leaders }, { data: departments }, { data: programs }, { data: highlights }] =
    await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("leadership").select("*").order("display_order"),
      supabase.from("departments").select("id, name, description").order("name"),
      supabase.from("programs").select("department_id, name"),
      supabase.from("portal_stats").select("*").order("display_order"),
    ]);

  const configMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  const programsByDepartment = new Map<string, string[]>();
  for (const program of programs ?? []) {
    const list = programsByDepartment.get(program.department_id) ?? [];
    list.push(program.name);
    programsByDepartment.set(program.department_id, list);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">About Us</h1>
          <p className="max-w-3xl text-xl text-blue-100">{configMap["AboutUs"]}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <Card>
              <CardContent className="p-8">
                <Target className="mb-4 h-12 w-12 text-blue-600" />
                <h2 className="mb-4 text-gray-900">Our Mission</h2>
                <p className="text-gray-600">{configMap["OurMission"]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8">
                <Eye className="mb-4 h-12 w-12 text-blue-600" />
                <h2 className="mb-4 text-gray-900">Our Vision</h2>
                <p className="text-gray-600">{configMap["OurVision"]}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-8">
              <History className="mb-4 h-12 w-12 text-blue-600" />
              <h2 className="mb-4 text-gray-900">Our History</h2>
              <p className="mb-4 text-gray-600">{configMap["OurHistory"]}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {leaders && leaders.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <h2 className="text-gray-900">Our Leadership</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => {
                const photoUrl = leader.photo_path
                  ? supabase.storage.from("public-assets").getPublicUrl(leader.photo_path).data.publicUrl
                  : undefined;
                return (
                  <Card key={leader.id}>
                    <CardContent className="p-6">
                      {photoUrl ? (
                        <ImageWithFallback
                          src={photoUrl}
                          alt={`${leader.first_name} ${leader.last_name}`}
                          className="mb-4 h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                          <span className="text-xl text-blue-600">
                            {((leader.first_name?.[0] ?? "") + (leader.last_name?.[0] ?? "")).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <h3 className="mb-1 text-gray-900">
                        {leader.title} {leader.first_name} {leader.last_name}
                      </h3>
                      <p className="mb-2 text-blue-600">{leader.position}</p>
                      <p className="text-sm text-gray-500">{leader.department}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {departments && departments.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-gray-900">Our Departments</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {departments.map((dept) => (
                <Card key={dept.id}>
                  <CardContent className="p-6">
                    <h3 className="mb-3 text-gray-900">{dept.name}</h3>
                    <p className="mb-4 text-gray-600">{dept.description}</p>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Programs Offered:</p>
                      <ul className="space-y-1">
                        {(programsByDepartment.get(dept.id) ?? []).map((programName) => (
                          <li key={programName} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            {programName}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {highlights && highlights.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-gray-900">Campus Highlights</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map((highlight) => (
                <Card key={highlight.id}>
                  <CardContent className="p-6 text-center">
                    <div className="mb-2 text-blue-600">{highlight.value}</div>
                    <p className="text-gray-600">{highlight.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
