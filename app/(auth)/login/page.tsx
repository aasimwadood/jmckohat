import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <>
      <p className="mb-6 text-center text-gray-600">Sign in to access your dashboard</p>
      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
