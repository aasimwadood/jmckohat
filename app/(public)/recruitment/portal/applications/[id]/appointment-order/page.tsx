import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireApplicant } from "@/lib/auth/applicant-session";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/features/recruitment/print-button";

export const metadata: Metadata = { title: "Appointment Order" };

export default async function AppointmentOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const applicant = await requireApplicant();
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("recruitment_applications")
    .select("id, applicant_id, position_id")
    .eq("id", id)
    .single();
  if (!application || application.applicant_id !== applicant.id) notFound();

  const { data: order } = await supabase
    .from("recruitment_appointment_orders")
    .select("order_number, issued_date, terms_and_conditions, reporting_instructions, joining_deadline, authorized_officer_name, authorized_officer_title")
    .eq("application_id", id)
    .single();
  if (!order) notFound();

  const { data: position } = await supabase
    .from("recruitment_positions")
    .select("title, bps_grade, advertisement_id")
    .eq("id", application.position_id)
    .single();

  const { data: advertisement } = position
    ? await supabase.from("recruitment_advertisements").select("college_id").eq("id", position.advertisement_id).single()
    : { data: null };

  const { data: college } = advertisement
    ? await supabase.from("colleges").select("name").eq("id", advertisement.college_id).single()
    : { data: null };

  const { data: applicantProfile } = await supabase
    .from("applicant_profiles")
    .select("full_name, father_name, cnic")
    .eq("id", applicant.id)
    .single();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; top: 0; left: 0; width: 100%; padding: 1in; }
        }
      `}</style>
      <div className="mb-4 print:hidden">
        <PrintButton />
      </div>
      <div className="print-area mx-auto max-w-2xl space-y-4 border p-8 text-sm leading-relaxed">
        <div className="text-center">
          <p className="text-lg font-bold uppercase">{college?.name}</p>
          <p className="mt-1 font-medium">Appointment Order</p>
          <p className="text-gray-500">Order No: {order.order_number}</p>
          <p className="text-gray-500">Date: {new Date(order.issued_date).toLocaleDateString()}</p>
        </div>

        <p>
          This is to confirm the appointment of <strong>{applicantProfile?.full_name}</strong>
          {applicantProfile?.father_name && <> S/D/O {applicantProfile.father_name}</>}
          {applicantProfile?.cnic && <> (CNIC: {applicantProfile.cnic})</>} to the position of{" "}
          <strong>{position?.title}</strong>
          {position?.bps_grade && ` (${position.bps_grade})`}.
        </p>

        {order.joining_deadline && (
          <p>
            The candidate is required to join by <strong>{new Date(order.joining_deadline).toLocaleDateString()}</strong>.
          </p>
        )}

        {order.reporting_instructions && (
          <div>
            <p className="font-medium">Reporting Instructions</p>
            <p>{order.reporting_instructions}</p>
          </div>
        )}

        {order.terms_and_conditions && (
          <div>
            <p className="font-medium">Terms & Conditions</p>
            <p className="whitespace-pre-wrap">{order.terms_and_conditions}</p>
          </div>
        )}

        <div className="pt-8 text-right">
          <p className="font-medium">{order.authorized_officer_name}</p>
          <p className="text-gray-500">{order.authorized_officer_title}</p>
        </div>
      </div>
    </>
  );
}
