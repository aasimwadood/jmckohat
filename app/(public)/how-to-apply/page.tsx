import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Calendar, AlertCircle, FileText, Send, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "How to Apply" };

const ICONS = { CheckCircle, FileText, Send, CreditCard, Calendar } as const;

// Sourced from §6 of the official Admission Policy for Government Colleges
// in Khyber Pakhtunkhwa (see the "Admission Policy" download on
// /downloads for the complete text) — not a generic placeholder list.
const REQUIRED_DOCUMENTS = [
  "SSC certificate (any level), and HSSC certificate for AD/BS programs",
  "Detailed marks / provisional certificate of the last exam passed",
  "Domicile certificate",
  "Own / father's CNIC or Form B",
  "Character certificate from the institution last attended (gazetted-officer-signed if passed privately)",
  "Required number of colored photographs, per college policy",
  "Quota eligibility certificate, if applying under a specified quota",
  "Original migration certificate (Board to Board), if SSC/O-A Level is from a different board",
  "Original migration certificate (Board to University), for BS/AD admission",
  "Verified HSSC detailed marks sheet from the concerned Board, for BS/AD admission",
  "Affidavit of non-involvement in politics",
];

export default async function HowToApplyPage() {
  const supabase = await createClient();

  const [{ data: steps }, { data: importantDates }] = await Promise.all([
    supabase.from("apply_steps").select("*").order("step_number"),
    supabase.from("important_dates").select("*").order("display_order"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">How to Apply</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Follow our step-by-step application process to join Government Postgraduate College Kohat.
          </p>
        </div>
      </section>

      {steps && steps.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-12 text-center text-gray-900">Application Process</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {steps.map((step) => {
                const Icon = (step.icon && ICONS[step.icon as keyof typeof ICONS]) || CheckCircle;
                return (
                  <Card key={step.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <div
                      className="absolute top-0 right-0 h-32 w-32 rounded-bl-full opacity-10"
                      style={{ background: step.color ?? "#2563eb" }}
                    />
                    <CardContent className="relative p-6">
                      <div className="mb-4 flex items-start gap-4">
                        <div
                          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                          style={{ background: step.color ?? "#2563eb" }}
                        >
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="mb-1 text-sm text-gray-500">Step {step.step_number}</p>
                          <h3 className="text-gray-900">{step.title}</h3>
                        </div>
                      </div>
                      <p className="text-gray-600">{step.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-gray-900">Important Dates</h2>
              <Card>
                <CardContent className="p-6">
                  {importantDates && importantDates.length > 0 ? (
                    <div className="space-y-4">
                      {importantDates.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="text-gray-900">{item.event}</span>
                          </div>
                          <span className="text-blue-600">
                            {item.start_date && new Date(item.start_date).toLocaleDateString()}
                            {item.end_date && ` - ${new Date(item.end_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Important dates have not been published yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="mb-6 text-gray-900">Required Documents</h2>
              <Card>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {REQUIRED_DOCUMENTS.map((doc) => (
                      <li key={doc} className="flex items-start gap-3">
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                        <span className="text-gray-700">{doc}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="flex-1">
                  <h3 className="mb-2 text-white">Processing Fee &amp; Full Policy</h3>
                  <p className="mb-4 text-blue-100">
                    Applications aren&apos;t processed until the processing fee is paid within the specified time.
                    See the Fee Structure page for exact amounts, and the full Admission Policy for the complete
                    eligibility, quota, and merit rules.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link href="/downloads">
                    <Button size="lg" variant="secondary">
                      Download Admission Policy
                    </Button>
                  </Link>
                  <Link href="/fee-structure">
                    <Button size="lg" variant="outline" className="border-white bg-white/10 text-white hover:bg-white/20">
                      View Fee Structure
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-yellow-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="border-yellow-200">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-8 w-8 flex-shrink-0 text-yellow-600" />
                <div>
                  <h3 className="mb-4 text-gray-900">Important Notes</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Applications cannot be submitted after the due date — apply as soon as forms are available.</li>
                    <li>• Students who failed one or more subjects in the preceding exam are not eligible to apply.</li>
                    <li>• A character certificate must be signed by a gazetted officer if the last exam was passed privately.</li>
                    <li>• Merit lists are displayed on the college notice board and the official admission website.</li>
                    <li>
                      • Shortlisted candidates must appear in person with a parent/guardian and original documents to
                      confirm admission.
                    </li>
                    <li>• Seats not confirmed by fee payment within the specified period are offered to the next candidate on the merit list.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
