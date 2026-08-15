"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateApplicantProfileAction } from "@/lib/actions/recruitment-applicant";

type Initial = {
  fullName: string;
  fatherName: string;
  cnic: string;
  dob: string;
  gender: string;
  phone: string;
  address: string;
  domicile: string;
};

export function ApplicantProfileForm({ initial }: { initial: Initial }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateApplicantProfileAction(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Profile updated");
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" name="fullName" defaultValue={initial.fullName} required />
          </div>
          <div>
            <Label htmlFor="fatherName">Father&apos;s Name</Label>
            <Input id="fatherName" name="fatherName" defaultValue={initial.fatherName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cnic">CNIC</Label>
              <Input id="cnic" name="cnic" defaultValue={initial.cnic} />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" name="dob" type="date" defaultValue={initial.dob} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" name="gender" defaultValue={initial.gender} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={initial.phone} />
            </div>
          </div>
          <div>
            <Label htmlFor="domicile">Domicile</Label>
            <Input id="domicile" name="domicile" defaultValue={initial.domicile} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} defaultValue={initial.address} />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
