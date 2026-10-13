"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { latestPayment, verifiedPaymentProofUrl } from "@/lib/payments";
import type { ApiPayment } from "@/lib/payments";

export default function PaymentProofDownload({ invoiceId }: { invoiceId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadProof() {
    setDownloading(true);
    setError("");
    try {
      // Refetch the payment record at click time, like activities are refetched
      // on page load, so we do not rely on an old one-hour presigned URL.
      const paymentResponse = await fetch(`/api/proxy/payments/?student_invoice_id=${encodeURIComponent(invoiceId)}`, { cache: "no-store" });
      const payload = await paymentResponse.json() as ApiPayment[] | { results?: ApiPayment[] };
      const payments = Array.isArray(payload) ? payload : payload.results || [];
      const currentUrl = verifiedPaymentProofUrl(latestPayment(payments));
      if (!paymentResponse.ok || !currentUrl) throw new Error("Bukti pembayaran tidak tersedia.");

      const response = await fetch(currentUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Bukti pembayaran sudah kedaluwarsa.");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "bukti-pembayaran";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Bukti pembayaran tidak dapat diunduh.");
    } finally {
      setDownloading(false);
    }
  }

  return <>
    <button className="outline-button full-button" type="button" onClick={downloadProof} disabled={downloading}>
      <Download /> {downloading ? "Menyiapkan unduhan…" : "Unduh bukti pembayaran"}
    </button>
    {error && <p className="form-message error" role="alert">{error} Minta bukti pembayaran baru jika diperlukan.</p>}
  </>;
}
