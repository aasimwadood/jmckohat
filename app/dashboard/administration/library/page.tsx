import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AddLibraryItemDialog } from "./add-item-dialog";

export default async function AdministrationLibraryPage() {
  await requireRole("administration");
  const supabase = await createClient();

  const { data: items } = await supabase.from("library_items").select("*").order("title");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Library Management</CardTitle>
          <AddLibraryItemDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items ?? []).map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.author ?? "—"}</TableCell>
                <TableCell>{item.isbn ?? "—"}</TableCell>
                <TableCell>{item.available_copies}</TableCell>
                <TableCell>{item.total_copies}</TableCell>
              </TableRow>
            ))}
            {(!items || items.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                  No library items yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
