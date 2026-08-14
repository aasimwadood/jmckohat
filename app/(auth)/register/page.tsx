import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name");

  return (
    <>
      <p className="mb-6 text-center text-gray-600">Create your student account</p>
      <RegisterForm departments={departments ?? []} />
    </>
  );
}
