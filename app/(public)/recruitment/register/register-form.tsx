"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { applicantRegisterSchema, type ApplicantRegisterInput } from "@/lib/validations/recruitment";
import { applicantRegisterAction } from "@/lib/actions/recruitment-applicant";

export function ApplicantRegisterForm({ redirectTo }: { redirectTo?: string }) {
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicantRegisterInput>({ resolver: zodResolver(applicantRegisterSchema) });

  const onSubmit = (values: ApplicantRegisterInput) => {
    setServerError("");
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ""));

    startTransition(async () => {
      const result = await applicantRegisterAction(redirectTo, formData);
      if (result?.error) setServerError(result.error);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create Applicant Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" disabled={isPending} {...register("fullName")} />
              {errors.fullName && <p className="mt-1 text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            <div>
              <Label htmlFor="fatherName">Father&apos;s Name</Label>
              <Input id="fatherName" disabled={isPending} {...register("fatherName")} />
            </div>
            <div>
              <Label htmlFor="cnic">CNIC</Label>
              <Input id="cnic" placeholder="xxxxx-xxxxxxx-x" disabled={isPending} {...register("cnic")} />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" disabled={isPending} {...register("email")} />
              {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="03xx-xxxxxxx" disabled={isPending} {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" disabled={isPending} {...register("password")} />
              {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" disabled={isPending} {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 text-center text-sm">
        <p className="mb-2 text-gray-600">
          Already have an account?{" "}
          <Link href={`/recruitment/login${redirectTo ? `?redirectTo=${redirectTo}` : ""}`} className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
        <Link href="/recruitment" className="text-blue-600 hover:underline">
          ← Back to Openings
        </Link>
      </div>
    </>
  );
}
