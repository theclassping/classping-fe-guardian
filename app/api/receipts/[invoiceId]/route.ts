import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { invoiceLookupForBackend, primaryGuardianNameForStudent, selectedStudentForRequest } from "@/lib/backend";
import { invoices } from "@/lib/data";
import { paymentReceiptFor, receiptFileName } from "@/lib/receipt";
import { buildReceiptPdf } from "@/lib/receiptPdf";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  const { child, studentId } = await selectedStudentForRequest();
  const lookup = await invoiceLookupForBackend(invoiceId, child.id, invoices.find((item) => item.slug === invoiceId));
  if (lookup.state === "missing") return NextResponse.json({ detail: "Tagihan tidak ditemukan." }, { status: 404 });
  if (lookup.state === "unavailable") return NextResponse.json({ detail: "Tagihan belum dapat dimuat." }, { status: 503 });

  const receipt = paymentReceiptFor(lookup.invoice, child, studentId);
  if (!receipt) return NextResponse.json({ detail: "Pembayaran untuk tagihan ini belum diverifikasi." }, { status: 409 });

  // Address the student's primary guardian, as the verification email does; fall back to the signed-in name.
  const linkedGuardianName = studentId ? await primaryGuardianNameForStudent(Number(studentId)) : undefined;
  const guardianName = linkedGuardianName || decodeIdentity((await cookies()).get("guardian_identity")?.value)?.name;
  const pdf = await buildReceiptPdf(receipt, { guardianName });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptFileName(receipt)}"`,
      "Cache-Control": "no-store",
    },
  });
}
