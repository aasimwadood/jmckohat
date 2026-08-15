import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getCurrentProfile } from "@/lib/auth/session";
import { listActiveColleges } from "@/lib/services/colleges";

export const metadata: Metadata = { title: "Our Colleges" };

export default async function CollegesDirectoryPage() {
  const profile = await getCurrentProfile();
  const colleges = await listActiveColleges();

  return (
    <div className="flex min-h-screen flex-col">
      <Header isAuthenticated={!!profile} />
      <div className="flex-1 bg-gray-50">
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-white">Our Colleges</h1>
            <p className="max-w-3xl text-xl text-blue-100">Select a college to visit its public website.</p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          {colleges.length === 0 ? (
            <p className="text-center text-gray-500">No colleges are published yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {colleges.map((college) => (
                <Link key={college.id} href={`/college/${college.slug}`}>
                  <Card className="h-full transition-all duration-300 hover:shadow-xl">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                        <Building2 className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="mb-1 text-gray-900">{college.name}</h3>
                        <p className="text-sm text-gray-500">{college.code}</p>
                        {college.address && <p className="mt-2 text-sm text-gray-600">{college.address}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
