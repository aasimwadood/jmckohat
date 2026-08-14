"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteSettingAction } from "@/lib/actions/site-settings";

export function SiteSettingsForm({
  fields,
  values,
}: {
  fields: { key: string; label: string }[];
  values: Record<string, string>;
}) {
  const [state, setState] = useState(values);
  const [isPending, startTransition] = useTransition();

  const saveAll = () => {
    startTransition(async () => {
      for (const field of fields) {
        const result = await saveSiteSettingAction(field.key, state[field.key] ?? "");
        if (result?.error) {
          toast.error(`${field.label}: ${result.error}`);
          return;
        }
      }
      toast.success("Settings saved");
    });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={field.key}>{field.label}</Label>
          <Textarea
            id={field.key}
            value={state[field.key] ?? ""}
            onChange={(e) => setState((prev) => ({ ...prev, [field.key]: e.target.value }))}
            disabled={isPending}
            rows={field.key.includes("Message") || field.key === "AboutUs" ? 3 : 1}
          />
        </div>
      ))}
      <Button onClick={saveAll} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}
