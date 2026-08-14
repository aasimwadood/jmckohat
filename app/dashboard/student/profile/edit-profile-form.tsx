"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import { updateOwnProfileAction } from "@/lib/actions/profile";

export function EditProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName, phone: phone ?? "" },
  });

  if (!editing) {
    return <Button onClick={() => setEditing(true)}>Edit Profile</Button>;
  }

  const onSubmit = (values: UpdateProfileInput) => {
    setError("");
    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("phone", values.phone ?? "");
    startTransition(async () => {
      const result = await updateOwnProfileAction(formData);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" disabled={isPending} {...register("fullName")} />
        {errors.fullName && <p className="mt-1 text-sm text-destructive">{errors.fullName.message}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" disabled={isPending} {...register("phone")} />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
