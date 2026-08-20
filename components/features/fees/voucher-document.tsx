import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// Three tear-off copies (Bank / College / Student) side by side on one
// landscape A4 sheet, separated by a dashed vertical line — matching the
// standard Pakistani bank fee-challan format: the payer hands the whole
// sheet to the bank teller, who keeps the Bank Copy, stamps the other two,
// retains the College Copy for the institution's records (submitted by the
// student later), and returns the Student Copy as proof of payment.

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: "Helvetica", color: "#111827", flexDirection: "row" },
  column: { flex: 1, paddingHorizontal: 11, borderRight: "1pt dashed #6b7280" },
  columnLast: { flex: 1, paddingHorizontal: 11 },
  logoRow: { alignItems: "center", marginBottom: 6 },
  logo: { width: 34, height: 34, marginBottom: 3 },
  collegeName: { fontSize: 11, fontWeight: 700, textAlign: "center" },
  sessionTitle: { fontSize: 9.5, fontWeight: 700, textAlign: "center", textDecoration: "underline", marginTop: 2, marginBottom: 10 },
  field: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5, borderBottom: "0.5pt dotted #9ca3af", paddingBottom: 3 },
  fieldLabel: { fontSize: 7.5, color: "#4b5563", width: "42%" },
  fieldValue: { fontSize: 8.5, fontWeight: 500, width: "58%", textAlign: "right" },
  sectionTitle: { fontSize: 9, fontWeight: 700, marginTop: 7, marginBottom: 4 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  lineItemLabel: { fontSize: 8, flex: 1 },
  lineItemValue: { fontSize: 8, textAlign: "right" },
  subtotalRow: { flexDirection: "row", justifyContent: "space-between", borderTop: "1pt solid #111827", marginTop: 2, paddingTop: 3 },
  subtotalLabel: { fontSize: 8.5, fontWeight: 700, flex: 1 },
  subtotalValue: { fontSize: 8.5, fontWeight: 700, textAlign: "right" },
  totalBox: { backgroundColor: "#111827", padding: 6, marginTop: 7, marginBottom: 7, flexDirection: "row", justifyContent: "space-between" },
  totalBoxLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  totalBoxValue: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  blankLine: { flexDirection: "row", marginBottom: 6, alignItems: "flex-end" },
  blankLabel: { fontSize: 8, color: "#374151" },
  blankUnderline: { flex: 1, borderBottom: "0.5pt solid #9ca3af", marginLeft: 5 },
  noteBox: { border: "1pt solid #6b7280", borderRadius: 3, padding: 6, marginTop: 4, marginBottom: 7 },
  noteText: { fontSize: 6.5, color: "#374151", lineHeight: 1.4 },
  signatureLine: { fontSize: 7.5, color: "#374151", marginTop: 10, marginBottom: 5, borderTop: "0.5pt solid #9ca3af", paddingTop: 4 },
  copyLabel: { backgroundColor: "#111827", color: "#ffffff", fontSize: 9.5, fontWeight: 700, textAlign: "center", paddingVertical: 4, textTransform: "uppercase" },
  watermark: { position: "absolute", top: 8, right: 6, fontSize: 7.5, color: "#dc2626", border: "1pt solid #dc2626", padding: "1.5pt 4pt" },
  bankNoAccounts: { fontSize: 7.5, color: "#9ca3af", fontStyle: "italic", marginBottom: 5 },
});

function formatPkr(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}/-`;
}

export type VoucherPdfData = {
  collegeName: string;
  logoDataUri: string | null;
  voucherNumber: string;
  status: "unpaid" | "verified" | "canceled";
  dueDate: string;
  generatedAt: string;
  studentName: string;
  fatherName: string | null;
  registrationNumber: string | null;
  /** Program name combined with the ordinal semester/year, e.g. "BS (Hons) - 4 Year - 5th" — pre-formatted by the caller. */
  discipline: string;
  academicSession: string;
  components: { name: string; amount: number }[];
  totalAmount: number;
  bankAccounts: { bankName: string; accountTitle: string | null; accountNumber: string }[];
  /** The student's own other pending dues (hostel/transport/etc, from fee_payments) — genuinely outstanding, not invented. */
  outstandingItems: { label: string; amount: number }[];
  outstandingTotal: number;
};

function VoucherColumn({ data, copyLabel, isLast }: { data: VoucherPdfData; copyLabel: string; isLast: boolean }) {
  const grandTotal = data.totalAmount + data.outstandingTotal;

  return (
    <View style={isLast ? styles.columnLast : styles.column}>
      {data.status === "verified" && <Text style={styles.watermark}>PAID</Text>}
      {data.status === "canceled" && <Text style={styles.watermark}>CANCELED</Text>}

      <View style={styles.logoRow}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML <img>, it doesn't accept alt */}
        {data.logoDataUri && <Image src={data.logoDataUri} style={styles.logo} />}
        <Text style={styles.collegeName}>{data.collegeName}</Text>
        <Text style={styles.sessionTitle}>Fee Slip for {data.academicSession}</Text>
      </View>

      {data.bankAccounts.length === 0 ? (
        <Text style={styles.bankNoAccounts}>No bank account configured yet</Text>
      ) : (
        data.bankAccounts.map((b, i) => (
          <View key={i} style={styles.field}>
            <Text style={styles.fieldLabel}>{b.bankName} A/C No.</Text>
            <Text style={styles.fieldValue}>{b.accountNumber}</Text>
          </View>
        ))
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Challan No.</Text>
        <Text style={styles.fieldValue}>{data.voucherNumber}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Registration No.</Text>
        <Text style={styles.fieldValue}>{data.registrationNumber ?? "—"}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Student&apos;s Name</Text>
        <Text style={styles.fieldValue}>{data.studentName}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Father&apos;s Name</Text>
        <Text style={styles.fieldValue}>{data.fatherName ?? "—"}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Discipline</Text>
        <Text style={styles.fieldValue}>{data.discipline}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Fee Due Date</Text>
        <Text style={styles.fieldValue}>{data.dueDate}</Text>
      </View>

      <Text style={styles.sectionTitle}>Fee Details</Text>
      {data.components.map((c, i) => (
        <View key={i} style={styles.lineItem}>
          <Text style={styles.lineItemLabel}>
            {i + 1}. {c.name}
          </Text>
          <Text style={styles.lineItemValue}>{formatPkr(c.amount)}</Text>
        </View>
      ))}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Current Semester Fee</Text>
        <Text style={styles.subtotalValue}>{formatPkr(data.totalAmount)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Outstanding Fee</Text>
      {data.outstandingItems.length === 0 ? (
        <View style={styles.lineItem}>
          <Text style={styles.lineItemLabel}>None</Text>
          <Text style={styles.lineItemValue}>{formatPkr(0)}</Text>
        </View>
      ) : (
        data.outstandingItems.map((o, i) => (
          <View key={i} style={styles.lineItem}>
            <Text style={styles.lineItemLabel}>{o.label}</Text>
            <Text style={styles.lineItemValue}>{formatPkr(o.amount)}</Text>
          </View>
        ))
      )}
      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Total Outstanding Amount</Text>
        <Text style={styles.subtotalValue}>{formatPkr(data.outstandingTotal)}</Text>
      </View>

      <View style={styles.totalBox}>
        <Text style={styles.totalBoxLabel}>Total Fee</Text>
        <Text style={styles.totalBoxValue}>{formatPkr(grandTotal)}</Text>
      </View>

      <View style={styles.blankLine}>
        <Text style={styles.blankLabel}>Fine Imposed:</Text>
        <View style={styles.blankUnderline} />
      </View>
      <View style={styles.blankLine}>
        <Text style={styles.blankLabel}>Amount Paid:</Text>
        <View style={styles.blankUnderline} />
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          You are requested to pay this fee on or before the due date shown above to avoid a late payment fine.
          Quote the Challan No. as the payment reference. Not valid if altered — this is a computer-generated document.
        </Text>
      </View>

      <Text style={styles.signatureLine}>Authorized Signature / Bank Stamp</Text>
      <Text style={styles.copyLabel}>{copyLabel}</Text>
    </View>
  );
}

export function VoucherDocument({ data }: { data: VoucherPdfData }) {
  return (
    <Document title={`Fee Voucher ${data.voucherNumber}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <VoucherColumn data={data} copyLabel="Bank Copy" isLast={false} />
        <VoucherColumn data={data} copyLabel="College Copy" isLast={false} />
        <VoucherColumn data={data} copyLabel="Student Copy" isLast={true} />
      </Page>
    </Document>
  );
}
