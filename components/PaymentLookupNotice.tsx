import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

type Props = {
  emoji: string;
  title: string;
  copy: string;
  listHref: string;
  retryHref?: string;
};

/** Friendly in-dashboard notice shown instead of a bare error when a bill link cannot be opened. */
export default function PaymentLookupNotice({ emoji, title, copy, listHref, retryHref }: Props) {
  return (
    <article className="detail-page payment-detail">
      <Link className="back-link" href={listHref}><ArrowLeft /> Kembali ke pembayaran</Link>
      <section className="empty-state panel" role="status">
        <span aria-hidden="true">{emoji}</span>
        <h2>{title}</h2>
        <p>{copy}</p>
        <div className="payment-lookup-actions">
          <Link className="primary-button" href={listHref}>Lihat daftar tagihan</Link>
          {retryHref && <Link className="outline-button" href={retryHref}><RefreshCw /> Coba lagi</Link>}
        </div>
      </section>
    </article>
  );
}
