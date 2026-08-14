import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock, Building2, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact Us" };

const ICONS = { Mail, Building2, HelpCircle, Phone } as const;

function getIcon(name: string | null) {
  const Icon = (name && ICONS[name as keyof typeof ICONS]) || Mail;
  return <Icon className="mb-4 h-10 w-10 text-blue-600" />;
}

export default async function ContactPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: officeHours }, { data: deptContacts }, { data: departments }, { data: campuses }] =
    await Promise.all([
      supabase.from("contact_info").select("*").order("display_order"),
      supabase.from("office_hours").select("*").order("display_order"),
      supabase.from("department_contacts").select("id, department_id, phone, email"),
      supabase.from("departments").select("id, name"),
      supabase.from("campus_locations").select("*"),
    ]);

  const departmentNames = new Map((departments ?? []).map((d) => [d.id, d.name]));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Contact Us</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Get in touch with us. We&apos;re here to help and answer any questions you may have.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {contacts && contacts.length > 0 && (
            <>
              <h2 className="mb-8 text-gray-900">How Can We Help?</h2>
              <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="p-6">
                      {getIcon(contact.icon)}
                      <h3 className="mb-2 text-gray-900">{contact.title}</h3>
                      <p className="mb-2 text-blue-600">{contact.details}</p>
                      <p className="text-sm text-gray-500">{contact.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <ContactForm />

            <div>
              <h2 className="mb-6 text-gray-900">Office Hours</h2>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <Clock className="mb-4 h-10 w-10 text-blue-600" />
                  {officeHours && officeHours.length > 0 ? (
                    <div className="space-y-3">
                      {officeHours.map((hours) => (
                        <div key={hours.id} className="flex justify-between">
                          <span className="text-gray-600">{hours.day}:</span>
                          <span className="text-gray-900">
                            {hours.status === "Closed" ? "Closed" : `${hours.opening_time} - ${hours.closing_time}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Office hours have not been published yet.</p>
                  )}
                </CardContent>
              </Card>

              <h3 className="mb-4 text-gray-900">Campus Locations</h3>
              {campuses && campuses.length > 0 ? (
                campuses.map((campus) => (
                  <Card key={campus.id} className="mb-4">
                    <CardContent className="p-6">
                      <h4 className="mb-3 text-gray-900">{campus.name}</h4>
                      <div className="space-y-2 text-sm">
                        {campus.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-600">{campus.address}</span>
                          </div>
                        )}
                        {campus.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-600">{campus.phone}</span>
                          </div>
                        )}
                        {campus.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="text-gray-600">{campus.email}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-gray-500">No campus locations published yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {deptContacts && deptContacts.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-gray-900">Department-Wise Contacts</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {deptContacts.map((dept) => (
                <Card key={dept.id}>
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-gray-900">
                      {dept.department_id ? departmentNames.get(dept.department_id) : "General"}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="text-gray-600">{dept.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="text-gray-600">{dept.email}</span>
                      </div>
                    </div>
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
