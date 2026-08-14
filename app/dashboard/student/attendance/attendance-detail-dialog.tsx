"use client";

import { useState } from "react";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Detail = { date: string; status: string };

export function AttendanceDetailDialog({ courseLabel, details }: { courseLabel: string; details: Detail[] }) {
  const [open, setOpen] = useState(false);
  const present = details.filter((d) => d.status === "present").length;

  const downloadCsv = () => {
    const rows = ["Date,Status", ...details.map((d) => `${d.date},${d.status}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseLabel}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Eye className="mr-1 h-4 w-4" />
        View Details
      </Button>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attendance Details - {courseLabel}</DialogTitle>
          <DialogDescription>
            Total: {present}/{details.length} ({details.length > 0 ? Math.round((present / details.length) * 100) : 0}%)
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.map((d) => (
                <TableRow key={d.date}>
                  <TableCell>{d.date}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "present" ? "default" : "destructive"} className="capitalize">
                      {d.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
