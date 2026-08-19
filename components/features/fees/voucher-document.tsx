import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  header: { flexDirection: "row", alignItems: "center", borderBottom: "2pt solid #111827", paddingBottom: 12, marginBottom: 16 },
  logo: { width: 48, height: 48, marginRight: 12 },
  collegeName: { fontSize: 16, fontWeight: 700 },
  collegeMeta: { fontSize: 9, color: "#4b5563", marginTop: 2 },
  title: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 16, textTransform: "uppercase" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6, color: "#374151" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#6b7280" },
  value: { flex: 1, fontWeight: 500 },
  table: { border: "1pt solid #d1d5db", marginTop: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #d1d5db" },
  tableRowLast: { flexDirection: "row" },
  tableHeaderCell: { flex: 1, padding: 6, backgroundColor: "#f3f4f6", fontWeight: 700, fontSize: 9 },
  tableCell: { flex: 1, padding: 6, fontSize: 9 },
  tableCellRight: { flex: 1, padding: 6, fontSize: 9, textAlign: "right" },
  totalRow: { flexDirection: "row", borderTop: "2pt solid #111827", marginTop: 2 },
  totalLabel: { flex: 1, padding: 6, fontWeight: 700, fontSize: 10 },
  totalValue: { flex: 1, padding: 6, fontWeight: 700, fontSize: 10, textAlign: "right" },
  instructions: { fontSize: 8.5, color: "#4b5563", marginTop: 20, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 30, left: 36, right: 36, fontSize: 8, color: "#9ca3af", textAlign: "center" },
  watermark: { position: "absolute", top: 40, right: 36, fontSize: 8, color: "#dc2626", border: "1pt solid #dc2626", padding: "3pt 8pt" },
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

export function VoucherDocument({ data }: { data: VoucherPdfData }) {
  return (
    <Document title={`Fee Voucher ${data.voucherNumber}`}>
      <Page size="A4" style={styles.page}>
        {data.status === "verified" && <Text style={styles.watermark}>PAID</Text>}
        {data.status === "canceled" && <Text style={styles.watermark}>CANCELED</Text>}

        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is not an HTML <img>, it doesn't accept alt */}
          {data.logoDataUri && <Image src={data.logoDataUri} style={styles.logo} />}
          <View>
            <Text style={styles.collegeName}>{data.collegeName}</Text>
            {data.collegeAddress && <Text style={styles.collegeMeta}>{data.collegeAddress}</Text>}
            {data.collegeContact && <Text style={styles.collegeMeta}>{data.collegeContact}</Text>}
          </View>
        </View>

        <Text style={styles.title}>Fee Voucher</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Voucher Number</Text>
            <Text style={styles.value}>{data.voucherNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Generated On</Text>
            <Text style={styles.value}>{data.generatedAt}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>{data.dueDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Student Name</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Father&apos;s Name</Text>
            <Text style={styles.value}>{data.fatherName ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registration Number</Text>
            <Text style={styles.value}>{data.registrationNumber ?? "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Program</Text>
            <Text style={styles.value}>{data.programName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Department</Text>
            <Text style={styles.value}>{data.departmentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Semester / Session</Text>
            <Text style={styles.value}>
              {data.semesterLabel} — {data.academicSession}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Details</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeaderCell}>Component</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right", flex: 0.5 }]}>Amount</Text>
            </View>
            {data.components.map((c, i) => (
              <View key={i} style={i === data.components.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.tableCell}>{c.name}</Text>
                <Text style={[styles.tableCellRight, { flex: 0.5 }]}>{formatPkr(c.amount)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={[styles.totalValue, { flex: 0.5 }]}>{formatPkr(data.totalAmount)}</Text>
          </View>
        </View>

        <Text style={styles.instructions}>
          Pay this exact amount at any designated bank branch on or before the due date shown above, quoting the Voucher
          Number as the payment reference. This voucher is system-generated and is not valid if altered. Retain the bank-
          stamped copy as proof of payment until your fee status is confirmed as Verified on the student portal.
        </Text>

        <Text style={styles.footer}>Generated by the college management system — {data.collegeName}</Text>
      </Page>
    </Document>
  );
}
