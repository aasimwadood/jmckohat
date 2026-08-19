import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database.types";

const VARIANT: Record<Database["public"]["Enums"]["fee_voucher_status"], "default" | "secondary" | "destructive" | "outline"> = {
  unpaid: "secondary",
  verified: "default",
  canceled: "destructive",
};

const LABEL: Record<Database["public"]["Enums"]["fee_voucher_status"], string> = {
  unpaid: "Pending Payment",
  verified: "Paid / Verified",
  canceled: "Canceled",
};

export function VoucherStatusBadge({ status }: { status: Database["public"]["Enums"]["fee_voucher_status"] }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
