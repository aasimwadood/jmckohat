import type { Metadata } from "next";
import { DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Fee Structure" };

const SCHOLARSHIPS = [
  "Merit-based scholarships (up to 100%)",
  "Need-based financial assistance",
  "HEC funded scholarships",
  "Provincial government scholarships",
  "Endowment fund scholarships",
];

const PAYMENT_OPTIONS = [
  "Online payment through bank portal",
  "Bank challan payment",
  "Installment plan available (conditions apply)",
  "Credit card payment accepted",
  "Payment deadline: 15th of each semester",
];

export default async function FeeStructurePage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: programFees }, { data: feeCategories }, { data: feeItems }] =
    await Promise.all([
      supabase.from("program_categories").select("*").order("display_order"),
      supabase.from("program_fees").select("*").order("display_order"),
      supabase.from("additional_fee_categories").select("*").order("display_order"),
      supabase.from("additional_fee_items").select("*").order("display_order"),
    ]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-4 text-white">Fee Structure</h1>
          <p className="max-w-3xl text-xl text-blue-100">
            Transparent and affordable fee structure for all postgraduate programs.
          </p>
        </div>
      </section>

      {categories && categories.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Tabs defaultValue={categories[0]?.id} className="w-full">
              <TabsList className="mb-8 grid w-full grid-cols-2 lg:grid-cols-4">
                {categories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id}>
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((cat) => {
                const rows = (programFees ?? []).filter((fee) => fee.category_id === cat.id);
                return (
                  <TabsContent key={cat.id} value={cat.id}>
                    <Card>
                      <CardContent className="p-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Program</TableHead>
                              <TableHead>Admission Fee</TableHead>
                              <TableHead>Tuition Fee (Per Semester)</TableHead>
                              <TableHead>Total (Per Semester)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.length > 0 ? (
                              rows.map((program) => (
                                <TableRow key={program.id}>
                                  <TableCell className="text-gray-900">{program.program_name}</TableCell>
                                  <TableCell>PKR {program.admission_fee.toLocaleString()}</TableCell>
                                  <TableCell>PKR {program.tuition_fee.toLocaleString()}</TableCell>
                                  <TableCell className="text-blue-600">
                                    PKR {program.total_fee.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-gray-500">
                                  No programs available in this category
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </section>
      )}

      {feeCategories && feeCategories.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-gray-900">Additional Fees &amp; Charges</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {feeCategories.map((category, index) => {
                const items = (feeItems ?? []).filter((item) => item.category_id === category.id);
                if (items.length === 0) return null;
                return (
                  <Card key={category.id}>
                    <CardContent className="p-6">
                      <div className="mb-6 flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${
                            index % 2 === 0 ? "from-blue-500 to-purple-600" : "from-orange-500 to-red-600"
                          }`}
                        >
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-gray-900">{category.name}</h3>
                      </div>
                      <Table>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell className="text-right">PKR {item.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-8">
                <CheckCircle className="mb-4 h-12 w-12" />
                <h3 className="mb-4 text-white">Scholarships Available</h3>
                <ul className="space-y-2">
                  {SCHOLARSHIPS.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <CardContent className="p-8">
                <DollarSign className="mb-4 h-12 w-12" />
                <h3 className="mb-4 text-white">Fee Payment Options</h3>
                <ul className="space-y-2">
                  {PAYMENT_OPTIONS.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
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
                    <li>• Fees are subject to revision as per college policy.</li>
                    <li>• Admission fee is non-refundable.</li>
                    <li>• Late fee will be charged after the due date.</li>
                    <li>• Security deposit will be refunded after course completion.</li>
                    <li>• Students must clear all dues before receiving degrees/transcripts.</li>
                    <li>• Fees do not include thesis/dissertation printing and binding costs.</li>
                    <li>• Hostel and transportation fees are separate (if availed).</li>
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
