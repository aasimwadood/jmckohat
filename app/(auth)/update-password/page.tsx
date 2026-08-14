import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Set New Password" };

export default function UpdatePasswordPage() {
  return (
    <>
      <p className="mb-6 text-center text-gray-600">Choose a new password for your account</p>
      <UpdatePasswordForm />
    </>
  );
}
