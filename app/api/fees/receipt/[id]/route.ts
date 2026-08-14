import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generates a plain-text receipt server-side from verified data. The
// legacy version built the same text client-side from whatever the API
// happened to return — this fetches the row through RLS (so a student can
// only ever receive their own receipt) rather than trusting a client-sent
// payload.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: payment, error } = await supabase.from("fee_payments").select("*").eq("id", id).single();
  if (error || !payment || payment.status !== "paid") {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const { data: student } = await supabase.from("profiles").select("full_name").eq("id", payment.student_profile_id).single();

  const receipt = `FEE PAYMENT RECEIPT
-------------------
Student: ${student?.full_name ?? "N/A"}
Fee Type: ${payment.fee_type}
Amount: PKR ${payment.amount.toLocaleString()}
Receipt Number: ${payment.receipt_number ?? "N/A"}
Verified: ${payment.verified_at ? new Date(payment.verified_at).toLocaleDateString() : "N/A"}
`;

  return new NextResponse(receipt, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="receipt_${id}.txt"`,
    },
  });
}
