"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatarAction } from "@/lib/actions/avatar";

export function AvatarUpload({ avatarUrl, fullName }: { avatarUrl: string | null; fullName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadAvatarAction(formData);
      if (result?.error) {
        toast.error(result.error);
        setPreview(null);
      } else {
        toast.success("Profile photo updated");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={preview ?? avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onChange}
          disabled={isPending}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isPending}>
          <Camera className="mr-2 h-4 w-4" />
          Change Photo
        </Button>
        <p className="mt-1 text-xs text-gray-500">PNG, JPEG or WEBP. Max 2MB.</p>
      </div>
    </div>
  );
}
