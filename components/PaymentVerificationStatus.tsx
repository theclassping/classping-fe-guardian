import { Clock3 } from "lucide-react";

export default function PaymentVerificationStatus({ description = "Bukti pembayaran sudah dikirim. Sekolah akan memeriksa dan memperbarui status tagihan Anda." }: { description?: string }) {
  return (
    <div className="payment-result partial payment-verification-status" role="status">
      <Clock3 aria-hidden="true" />
      <div>
        <strong>Menunggu verifikasi sekolah</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
