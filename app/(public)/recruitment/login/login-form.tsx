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
import { applicantLoginSchema, type ApplicantLoginInput } from "@/lib/validations/recruitment";
import { applicantLoginAction } from "@/lib/actions/recruitment-applicant";

export function ApplicantLoginForm({ redirectTo }: { redirectTo?: string }) {
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicantLoginInput>({ resolver: zodResolver(applicantLoginSchema) });

  const onSubmit = (values: ApplicantLoginInput) => {
    setServerError("");
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await applicantLoginAction(redirectTo, formData);
      if (result?.error) setServerError(result.error);
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Applicant Login</CardTitle>
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
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" disabled={isPending} {...register("email")} />
              {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" disabled={isPending} {...register("password")} />
              {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 text-center text-sm">
        <p className="mb-2 text-gray-600">
          New applicant?{" "}
          <Link href={`/recruitment/register${redirectTo ? `?redirectTo=${redirectTo}` : ""}`} className="text-blue-600 hover:underline">
            Create an account
          </Link>
        </p>
        <Link href="/recruitment" className="text-blue-600 hover:underline">
          ← Back to Openings
        </Link>
      </div>
    </>
  );
}
