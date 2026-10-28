"use client";

import { Clock3, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { startVerificationPolling } from "@/lib/verificationPolling";

export default function PaymentVerificationStatus({
  description = "Bukti pembayaran sudah dikirim. Sekolah akan memeriksa dan memperbarui status tagihan Anda.",
  live = true,
}: { description?: string; live?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!live) return;
    return startVerificationPolling({ refresh: () => router.refresh() });
  }, [live, router]);

  return (
    <div className="payment-result partial payment-verification-status" role="status">
      <Clock3 aria-hidden="true" />
      <div>
        <strong>Menunggu verifikasi sekolah</strong>
        <p>{description}</p>
        {live && (
          <p className="payment-verification-live">
            <RefreshCw aria-hidden="true" /> Status diperbarui otomatis saat sekolah selesai memeriksa.
            <button type="button" onClick={() => router.refresh()}>Periksa sekarang</button>
          </p>
        )}
      </div>
    </div>
  );
}
