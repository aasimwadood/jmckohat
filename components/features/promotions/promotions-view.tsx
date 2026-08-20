"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { startPromotionCycleAction, registerPromotionCoursesAction } from "@/lib/actions/promotions";
import { finalizePromotionAction } from "@/lib/actions/fees";

export type PromotionRow = {
  id: string;
  studentName: string;
  cgpa: number | null;
  academicStanding: string;
  maxCourses: number;
  status: string;
  registeredCount: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  fee_pending: "secondary",
  pending_registration: "secondary",
  registration_complete: "outline",
  promoted: "default",
};

export function PromotionsView({
  role,
  departmentId,
  promotions,
  availableCourses,
}: {
  role: "department" | "administration" | "admin" | "focal_person_intermediate";
  departmentId: string;
  promotions: PromotionRow[];
  availableCourses: { id: string; code: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const canStartCycle = role === "department" || role === "admin" || role === "focal_person_intermediate";
  const canRegister = role === "department" || role === "admin" || role === "focal_person_intermediate";
  const canVerifyFee = role === "administration" || role === "admin";

  const startCycle = () => {
    startTransition(async () => {
      const result = await startPromotionCycleAction(departmentId);
      if (result?.error) toast.error(result.error);
      else toast.success("Promotion cycle started for eligible students");
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Promotions</CardTitle>
          {canStartCycle && (
            <Button onClick={startCycle} disabled={isPending} variant="outline">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Start Promotion Cycle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>CGPA</TableHead>
              <TableHead>Standing</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.studentName}</TableCell>
                <TableCell>{p.cgpa?.toFixed(2) ?? "—"}</TableCell>
                <TableCell className="capitalize">{p.academicStanding.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  {p.registeredCount}/{p.maxCourses}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="capitalize">
                    {p.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.status === "fee_pending" && <span className="text-sm text-gray-500">Awaiting fee payment</span>}
                  {p.status === "pending_registration" && canRegister && (
                    <RegisterCoursesDialog promotionId={p.id} maxCourses={p.maxCourses} courses={availableCourses} />
                  )}
                  {p.status === "registration_complete" && canVerifyFee && <FinalizePromotionDialog promotionId={p.id} />}
                </TableCell>
              </TableRow>
            ))}
            {promotions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                  No promotion cycles in progress.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RegisterCoursesDialog({
  promotionId,
  maxCourses,
  courses,
}: {
  promotionId: string;
  maxCourses: number;
  courses: { id: string; code: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < maxCourses ? [...prev, id] : prev));
  };

  const submit = () => {
    setError("");
    const formData = new FormData();
    formData.set("promotionId", promotionId);
    selected.forEach((id) => formData.append("courseIds", id));
    startTransition(async () => {
      const result = await registerPromotionCoursesAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Register Courses
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Courses (max {maxCourses})</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {courses.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} disabled={isPending} />
              {c.code} - {c.title}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Fee clearance already happened upstream (voucher generated + verified via
// bank match or manual override) before a promotion can even reach
// registration_complete — this step just finalizes the promotion once
// courses are registered. Receipt number is an optional legacy reference,
// not a fee check (see supabase/migrations/0062_promotion_fee_gating.sql).
function FinalizePromotionDialog({ promotionId }: { promotionId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    setError("");
    formData.set("promotionId", promotionId);
    startTransition(async () => {
      const result = await finalizePromotionAction(formData);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Finalize Promotion
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalize Promotion</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div>
            <Label htmlFor="receiptNumber">Reference Number (optional)</Label>
            <Input id="receiptNumber" name="receiptNumber" disabled={isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm — Promotes Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
