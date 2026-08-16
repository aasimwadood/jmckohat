import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdministrationMessagesPage() {
  await requireRole("administration");
  const supabase = await createClient();

  const { data: messages } = await supabase.from("messages").select("*").order("created_at", { ascending: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(messages ?? []).map((m) => (
          <div key={m.id} className="rounded-lg border p-4">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{m.subject || "(no subject)"}</p>
              <span className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              {m.name} &lt;{m.email}&gt;
              {m.phone_number && ` · ${m.phone_number}`}
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{m.body}</p>
          </div>
        ))}
        {(!messages || messages.length === 0) && (
          <p className="py-8 text-center text-gray-500">No messages yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
