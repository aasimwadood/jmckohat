"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FileText, Users, CheckCircle, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createAdvertisementAction } from "@/lib/actions/recruitment";
import type { AdvertisementRow, RecruitmentStats } from "./types";

const AD_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  published: "secondary",
  applications_open: "default",
  applications_closed: "secondary",
  selection_finalized: "default",
  appointment_orders_issued: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export function RecruitmentDashboardView({
  collegeId,
  advertisements,
  stats,
}: {
  collegeId: string;
  advertisements: AdvertisementRow[];
  stats: RecruitmentStats;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-gray-900">Recruitment</h1>
          <p className="text-gray-600">Advertisements, applications, and appointments</p>
        </div>
        <CreateAdvertisementDialog collegeId={collegeId} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Advertisements" value={stats.totalAdvertisements} sub={`${stats.activeAdvertisements} active`} icon={FileText} />
        <Stat label="Applications" value={stats.totalApplications} sub={`${stats.eligible} eligible`} icon={Users} />
        <Stat label="Shortlisted" value={stats.shortlisted} icon={CheckCircle} />
        <Stat label="Selected" value={stats.selected} sub={`${stats.appointmentsIssued} appointed`} icon={Award} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advertisements</CardTitle>
        </CardHeader>
        <CardContent>
          {advertisements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No advertisements yet — create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Ad #</TableHead>
                    <TableHead>Positions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Closing</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertisements.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.title}</TableCell>
                      <TableCell>{ad.adNumber ?? "—"}</TableCell>
                      <TableCell>{ad.positionsCount}</TableCell>
                      <TableCell>
                        <Badge variant={AD_STATUS_VARIANT[ad.status] ?? "outline"} className="capitalize">
                          {ad.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(ad.closingDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/recruitment/${ad.id}`}>Manage</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: number; sub?: string; icon: typeof FileText }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500">{sub}</p>}
          </div>
          <Icon className="h-10 w-10 text-blue-500" />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAdvertisementDialog({ collegeId }: { collegeId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    formData.set("collegeId", collegeId);
    startTransition(async () => {
      const result = await createAdvertisementAction(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Advertisement created as a draft");
        setOpen(false);
      }
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Advertisement</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Recruitment Advertisement</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Faculty Recruitment 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="adNumber">Advertisement #</Label>
              <Input id="adNumber" name="adNumber" placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="adDate">Ad Date</Label>
              <Input id="adDate" name="adDate" type="date" defaultValue={today} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="openingDate">Opening Date</Label>
              <Input id="openingDate" name="openingDate" type="date" defaultValue={today} required />
            </div>
            <div>
              <Label htmlFor="closingDate">Closing Date</Label>
              <Input id="closingDate" name="closingDate" type="date" required />
            </div>
          </div>
          <div>
            <Label htmlFor="interviewDate">Interview Date (optional)</Label>
            <Input id="interviewDate" name="interviewDate" type="date" />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="e.g. Main Campus, Kohat" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div>
            <Label htmlFor="instructions">General Instructions</Label>
            <Textarea id="instructions" name="instructions" rows={3} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create as Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
