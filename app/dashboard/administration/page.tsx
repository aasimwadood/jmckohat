import { DollarSign, BookOpen, HelpCircle, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdministrationOverviewPage() {
  const profile = await requireRole("administration");
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthIso = startOfMonth.toISOString();

  const [{ data: feesThisMonth }, { data: library }, { count: activeTickets }, { count: upcomingEvents }] =
    await Promise.all([
      supabase.from("fee_payments").select("amount").eq("status", "paid").gte("verified_at", startOfMonthIso),
      supabase.from("library_items").select("total_copies, available_copies"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
      supabase.from("campus_events").select("id", { count: "exact", head: true }).gte("event_date", new Date().toISOString().slice(0, 10)),
    ]);

  const feeCollection = (feesThisMonth ?? []).reduce((sum, f) => sum + f.amount, 0);
  const booksIssued = (library ?? []).reduce((sum, b) => sum + (b.total_copies - b.available_copies), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Administration Dashboard</h1>
        <p className="text-gray-600">Non-Academic Services Management — {profile.fullName}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Stat label="Fee Collection (This Month)" value={`PKR ${feeCollection.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
        <Stat label="Library Books Issued" value={String(booksIssued)} icon={BookOpen} color="text-blue-600" />
        <Stat label="Active Support Tickets" value={String(activeTickets ?? 0)} icon={HelpCircle} color="text-purple-600" />
        <Stat label="Upcoming Events" value={String(upcomingEvents ?? 0)} icon={Calendar} color="text-orange-600" />
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof DollarSign; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Icon className={`mb-4 h-10 w-10 ${color}`} />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
