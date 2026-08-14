import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="mb-6 text-center text-gray-600">
        Enter your email and we&apos;ll send you a reset link
      </p>
      <ForgotPasswordForm />
    </>
  );
}
