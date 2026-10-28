import PaymentLookupNotice from "@/components/PaymentLookupNotice";

/** Rendered when a bill link no longer resolves, e.g. a parent reopens an old link after the bill was updated or verified. */
export default function PaymentNotFound() {
  return (
    <PaymentLookupNotice
      emoji="🧾"
      title="Tagihan tidak ditemukan"
      copy="Tautan ini sudah tidak berlaku. Jika pembayaran Anda sudah diverifikasi sekolah, statusnya tetap tercatat dan dapat dilihat di daftar tagihan. Hubungi staf sekolah bila Anda merasa ada yang keliru."
      listHref="/dashboard/payments"
    />
  );
}
