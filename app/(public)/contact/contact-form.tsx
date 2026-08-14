"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { contactMessageSchema, type ContactMessageInput } from "@/lib/validations/contact";
import { sendContactMessageAction } from "@/lib/actions/contact";

export function ContactForm() {
  const [serverError, setServerError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactMessageInput>({ resolver: zodResolver(contactMessageSchema) });

  const onSubmit = (values: ContactMessageInput) => {
    setServerError("");
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ""));

    startTransition(async () => {
      const result = await sendContactMessageAction(formData);
      if (result?.error) {
        setServerError(result.error);
      } else {
        reset();
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    });
  };

  return (
    <div>
      <h2 className="mb-6 text-gray-900">Send us a Message</h2>

      {submitSuccess && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          Message sent successfully!
        </div>
      )}
      {serverError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{serverError}</div>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Enter your name" disabled={isPending} {...register("name")} />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                disabled={isPending}
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                placeholder="+92-XXX-XXXXXXX"
                disabled={isPending}
                {...register("phoneNumber")}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="How can we help?" disabled={isPending} {...register("subject")} />
            </div>
            <div>
              <Label htmlFor="body">Message *</Label>
              <Textarea
                id="body"
                placeholder="Tell us more about your inquiry..."
                rows={6}
                disabled={isPending}
                {...register("body")}
              />
              {errors.body && <p className="mt-1 text-sm text-destructive">{errors.body.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
