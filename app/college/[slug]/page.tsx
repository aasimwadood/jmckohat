import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Wifi,
  Network,
  Star,
  Heart,
  Sparkles,
  CheckCircle,
  Award,
  BookOpen,
  Users,
  TrendingUp,
  GraduationCap,
  Building2,
  Trophy,
  Lightbulb,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";
import { getCollegeBySlug } from "@/lib/services/colleges";
import { LeadershipMessages, FacultiesSection, NewsSection } from "@/app/(public)/home-interactive";

const ICONS: Record<string, LucideIcon> = {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Wifi,
  Network,
  Star,
  Heart,
  GraduationCap,
  Building2,
  Trophy,
  Lightbulb,
  Globe,
};

function Icon({ name, className }: { name: string | null; className?: string }) {
  const Cmp = (name && ICONS[name]) || Sparkles;
  return <Cmp className={className} />;
}

export default async function CollegeHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);
  if (!college) notFound();
  const basePath = `/college/${slug}`;

  const supabase = await createClient();

  const [
    { data: settings },
    { data: faculties },
    { data: quickStats },
    { data: news },
    { data: features },
  ] = await Promise.all([
    supabase.from("site_settings").select("key, value").eq("college_id", college.id),
    supabase.from("institution_faculties").select("*").eq("college_id", college.id).order("display_order"),
    supabase.from("portal_quick_stats").select("*").eq("college_id", college.id).order("display_order"),
    supabase.from("portal_news").select("*").eq("college_id", college.id).order("published_at", { ascending: false }).limit(4),
    supabase.from("portal_features").select("*").eq("college_id", college.id).order("display_order"),
  ]);

  const configMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  const leaders = [
    {
      title: "Minister's Message",
      name: configMap["MinisterName"] ?? "",
      designation: "Higher Education Minister",
      image: configMap["MinisterPhotoUrl"],
      message: configMap["MinisterShortMessage"] ?? "",
      fullMessage: configMap["MinisterFullMessage"] ?? "",
    },
    {
      title: "Principal's Message",
      name: configMap["PrincipalName"] ?? college.principalName ?? "",
      designation: "Principal",
      image: configMap["PrincipalPhotoUrl"] ?? college.principalPhotoPath ?? undefined,
      message: configMap["PrincipalShortMessage"] ?? "",
      fullMessage: configMap["PrincipalFullMessage"] ?? "",
    },
  ].filter((l) => l.name);

  const statsBanner = [
    { icon: "Wifi", label: "1 Gbps Internet", value: configMap["1GbpsInternet"] },
    { icon: "Network", label: "Campus Coverage", value: configMap["CampusCoverage"] },
    { icon: "Star", label: "NAAC Rating", value: configMap["NAACRating"] },
    { icon: "Heart", label: "Student Satisfaction", value: configMap["StudentSatisfaction"] },
  ].filter((s) => s.value);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-white">Welcome to {college.name}</h1>
            <p className="mb-8 text-xl text-blue-100">{configMap["WelcomeToOurInstitution"]}</p>
            <div className="flex flex-wrap gap-4">
              <Link href={`${basePath}/downloads`}>
                <Button size="lg" variant="secondary">
                  Apply Now
                </Button>
              </Link>
              <Link href={`${basePath}/about`}>
                <Button size="lg" variant="outline" className="border-white bg-white/10 text-white hover:bg-white/20">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {leaders.length > 0 && <LeadershipMessages leaders={leaders} />}

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">Excellence in Every Aspect</span>
            </div>
            <h2 className="mb-4 text-gray-900">Why Choose {college.name}</h2>
            <p className="mx-auto max-w-3xl text-lg text-gray-600">{configMap["WhyChooseOurInstitution"]}</p>
          </div>

          {features && features.length > 0 && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.id}
                  className="group border-0 bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                >
                  <CardContent className="p-8">
                    <div className="relative mb-6">
                      <div
                        className={`flex h-20 w-20 transform items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${feature.gradient ?? "from-blue-500 to-cyan-500"}`}
                      >
                        <Icon name={feature.icon} className="h-10 w-10 text-white" />
                      </div>
                      {feature.stat && (
                        <div
                          className={`absolute -top-2 -right-2 rounded-full bg-gradient-to-br px-3 py-1 text-xs text-white shadow-lg ${feature.gradient ?? "from-blue-500 to-cyan-500"}`}
                        >
                          {feature.stat}
                        </div>
                      )}
                    </div>
                    <h3 className="mb-3 text-gray-900 transition-colors group-hover:text-blue-600">
                      {feature.title}
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                    {feature.stat_label && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{feature.stat_label}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {statsBanner.length > 0 && (
            <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
              {statsBanner.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/80 p-6 text-center backdrop-blur-sm transition-shadow hover:shadow-lg">
                  <Icon name={stat.icon} className="mx-auto mb-3 h-8 w-8 text-blue-600" />
                  <div className="mb-1 text-sm text-gray-600">{stat.label}</div>
                  <div className="text-gray-900">{stat.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <FacultiesSection
        faculties={(faculties ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          dean: f.dean ?? "",
          description: f.description ?? "",
          image: f.image_path ?? undefined,
          color: f.color ?? "from-blue-500 to-purple-600",
          programs: f.programs,
          fullDetail: f.full_detail ?? "",
        }))}
      />

      {quickStats && quickStats.length > 0 && (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((stat) => (
                <Card key={stat.id} className="group text-center transition-shadow hover:shadow-lg">
                  <CardContent className="pt-6">
                    <Icon
                      name={stat.icon}
                      className={`mx-auto mb-4 h-12 w-12 transition-transform group-hover:scale-110 ${stat.color_class ?? "text-blue-600"}`}
                    />
                    <div className="mb-2 text-gray-900">{stat.value}</div>
                    <p className="text-gray-600">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <NewsSection
        news={(news ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          date: n.published_at,
          category: n.category ?? "",
          fullMessage: n.body ?? "",
        }))}
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-gray-900">Explore Our Campus</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="group overflow-hidden">
              <div className="relative aspect-video overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1652305500057-0fcb348b62aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                  alt="Academic Excellence"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="mb-3 text-gray-900">Academic Excellence</h3>
                <p className="mb-4 text-gray-600">
                  World-class faculty and state-of-the-art facilities for comprehensive learning.
                </p>
                <Link href={`${basePath}/about`}>
                  <Button variant="link" className="p-0">
                    Learn More →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group overflow-hidden">
              <div className="relative aspect-video overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1738949538812-aebbb54a0592?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
                  alt="Student Life"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="mb-3 text-gray-900">Student Life</h3>
                <p className="mb-4 text-gray-600">
                  Vibrant campus culture with diverse extracurricular activities and events.
                </p>
                <Link href={`${basePath}/about`}>
                  <Button variant="link" className="p-0">
                    Learn More →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group overflow-hidden">
              <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                <Award className="h-20 w-20 text-white transition-transform duration-300 group-hover:scale-110" />
              </div>
              <CardContent className="p-6">
                <h3 className="mb-3 text-gray-900">Admissions</h3>
                <p className="mb-4 text-gray-600">Join our community of learners. Applications are open.</p>
                <Link href={`${basePath}/how-to-apply`}>
                  <Button variant="link" className="p-0">
                    Apply Now →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
