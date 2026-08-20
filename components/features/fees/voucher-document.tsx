import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// Three tear-off copies (Bank / College / Student) stacked on one A4 sheet,
// matching how a real bank fee challan is printed and processed: the payer
// hands the whole sheet to the bank teller, who keeps the Bank Copy, stamps
// the other two, retains the College Copy for the institution's records
// (submitted by the student later), and returns the Student Copy as proof
// of payment.

const styles = StyleSheet.create({
  page: { padding: 14, fontFamily: "Helvetica", color: "#111827" },
  copy: { border: "1pt solid #111827", padding: 7, marginBottom: 5 },
  copyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  copyHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: { width: 26, height: 26, marginRight: 6 },
  collegeName: { fontSize: 10.5, fontWeight: 700 },
  collegeMeta: { fontSize: 6, color: "#4b5563" },
  copyLabel: { fontSize: 8.5, fontWeight: 700, border: "1pt solid #111827", paddingVertical: 2, paddingHorizontal: 7, textTransform: "uppercase" },
  title: { fontSize: 8.5, fontWeight: 700, textAlign: "center", marginBottom: 4, textTransform: "uppercase", color: "#374151" },
  infoGrid: { flexDirection: "row", marginBottom: 3 },
  infoCell: { flex: 1 },
  infoLabel: { fontSize: 6, color: "#6b7280" },
  infoValue: { fontSize: 7.5, fontWeight: 500 },
  table: { border: "1pt solid #d1d5db", marginTop: 4, marginBottom: 3 },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #d1d5db" },
  tableRowLast: { flexDirection: "row" },
  tableHeaderCell: { flex: 1, padding: 2.5, backgroundColor: "#f3f4f6", fontWeight: 700, fontSize: 6.5 },
  tableCell: { flex: 1, padding: 2.5, fontSize: 7 },
  tableCellRight: { flex: 0.5, padding: 2.5, fontSize: 7, textAlign: "right" },
  totalRow: { flexDirection: "row", borderTop: "1.5pt solid #111827" },
  totalLabel: { flex: 1, padding: 2.5, fontWeight: 700, fontSize: 7.5 },
  totalValue: { flex: 0.5, padding: 2.5, fontWeight: 700, fontSize: 7.5, textAlign: "right" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 },
  instructions: { fontSize: 5.5, color: "#4b5563", flex: 1, marginRight: 8, lineHeight: 1.35 },
  stampBox: { width: 110, height: 22, border: "1pt dashed #9ca3af", justifyContent: "center", alignItems: "center" },
  stampLabel: { fontSize: 5.5, color: "#9ca3af" },
  watermark: { position: "absolute", top: 4, right: 8, fontSize: 6.5, color: "#dc2626", border: "1pt solid #dc2626", padding: "1pt 4pt" },
});

export type VoucherPdfData = {
  collegeName: string;
  collegeAddress: string | null;
  collegeContact: string | null;
  logoDataUri: string | null;
  voucherNumber: string;
  status: "unpaid" | "verified" | "canceled";
  dueDate: string;
  generatedAt: string;
  studentName: string;
  fatherName: string | null;
  registrationNumber: string | null;
  programName: string;
  departmentName: string;
  /** "Semester 3" for BS-style programs, "First Year"/"Second Year" for Intermediate — pre-formatted by the caller. */
  semesterLabel: string;
  academicSession: string;
  components: { name: string; amount: number }[];
  totalAmount: number;
};

function formatPkr(amount: number) {
  return `PKR ${amount.toLocaleString("en-PK")}`;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function VoucherCopy({ data, copyLabel }: { data: VoucherPdfData; copyLabel: string }) {
  return (
    <View style={styles.copy} wrap={false}>
      {data.status === "verified" && <Text style={styles.watermark}>PAID</Text>}
      {data.status === "canceled" && <Text style={styles.watermark}>CANCELED</Text>}

      <View style={styles.copyHeader}>
        <View style={styles.copyHeaderLeft}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML <img>, it doesn't accept alt */}
          {data.logoDataUri && <Image src={data.logoDataUri} style={styles.logo} />}
          <View>
            <Text style={styles.collegeName}>{data.collegeName}</Text>
            {data.collegeAddress && <Text style={styles.collegeMeta}>{data.collegeAddress}</Text>}
            {data.collegeContact && <Text style={styles.collegeMeta}>{data.collegeContact}</Text>}
          </View>
        </View>
        <Text style={styles.copyLabel}>{copyLabel}</Text>
      </View>

      <Text style={styles.title}>Fee Voucher</Text>

      <View style={styles.infoGrid}>
        <InfoField label="Voucher Number" value={data.voucherNumber} />
        <InfoField label="Due Date" value={data.dueDate} />
        <InfoField label="Registration Number" value={data.registrationNumber ?? "—"} />
      </View>
      <View style={styles.infoGrid}>
        <InfoField label="Student Name" value={data.studentName} />
        <InfoField label="Father's Name" value={data.fatherName ?? "—"} />
        <InfoField label="Program / Department" value={`${data.programName}, ${data.departmentName}`} />
      </View>
      <View style={styles.infoGrid}>
        <InfoField label="Semester / Session" value={`${data.semesterLabel} — ${data.academicSession}`} />
        <InfoField label="Generated On" value={data.generatedAt} />
        <View style={styles.infoCell} />
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={styles.tableHeaderCell}>Component</Text>
          <Text style={[styles.tableHeaderCell, { textAlign: "right", flex: 0.5 }]}>Amount</Text>
        </View>
        {data.components.map((c, i) => (
          <View key={i} style={i === data.components.length - 1 ? styles.tableRowLast : styles.tableRow}>
            <Text style={styles.tableCell}>{c.name}</Text>
            <Text style={styles.tableCellRight}>{formatPkr(c.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>{formatPkr(data.totalAmount)}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.instructions}>
          Pay this exact amount at any designated bank branch on or before the due date, quoting the Voucher Number as
          the payment reference. Not valid if altered. This is a computer-generated document.
        </Text>
        <View style={styles.stampBox}>
          <Text style={styles.stampLabel}>Bank Stamp & Signature</Text>
        </View>
      </View>
    </View>
  );
}

export function VoucherDocument({ data }: { data: VoucherPdfData }) {
  return (
    <Document title={`Fee Voucher ${data.voucherNumber}`}>
      <Page size="A4" style={styles.page}>
        <VoucherCopy data={data} copyLabel="Bank Copy" />
        <VoucherCopy data={data} copyLabel="College Copy" />
        <VoucherCopy data={data} copyLabel="Student Copy" />
      </Page>
    </Document>
  );
}
