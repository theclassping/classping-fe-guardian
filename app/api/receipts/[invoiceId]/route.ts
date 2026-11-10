import { NextRequest, NextResponse } from "next/server";
import { invoiceLookupForBackend, primaryGuardianNameForStudent, selectedStudentForRequest, sessionIdentity } from "@/lib/backend";
import { errorResponse } from "@/lib/http";
import { paymentReceiptFor, receiptFileName } from "@/lib/receipt";
import { buildReceiptPdf } from "@/lib/receiptPdf";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  const { child, studentId, numericStudentId } = await selectedStudentForRequest();
  const lookup = await invoiceLookupForBackend(invoiceId, child.id);
  if (lookup.state === "missing") return errorResponse("Tagihan tidak ditemukan.", 404);
  if (lookup.state === "unavailable") return errorResponse("Tagihan belum dapat dimuat.", 503);

  const receipt = paymentReceiptFor(lookup.invoice, child, studentId);
  if (!receipt) return errorResponse("Pembayaran untuk tagihan ini belum diverifikasi.", 409);

  // Address the student's primary guardian, as the verification email does; fall back to the signed-in name.
  const linkedGuardianName = numericStudentId ? await primaryGuardianNameForStudent(numericStudentId) : undefined;
  const guardianName = linkedGuardianName || (await sessionIdentity())?.name;
  const pdf = await buildReceiptPdf(receipt, { guardianName });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptFileName(receipt)}"`,
      "Cache-Control": "no-store",
    },
  });
}
