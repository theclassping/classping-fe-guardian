import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Images, ReceiptText, Sparkles } from "lucide-react";
import BillReminderDialog from "@/components/BillReminderDialog";
import InvoicePaymentActions from "@/components/InvoicePaymentActions";
import PaymentVerificationStatus from "@/components/PaymentVerificationStatus";
import PresignedImage from "@/components/PresignedImage";
import type { Activity, ChildProfile, Invoice } from "@/lib/data";
import { greetingFor, latestOpenInvoice, recentActivities } from "@/lib/dashboard";

const PAY_TRIGGER_ID = "dashboard-pay-trigger";

function currentDate() {
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
}

export type DashboardViewProps = {
  guardianName: string;
  child: ChildProfile;
  childQuery: string;
  invoices: Invoice[] | null;
  activities: Activity[];
  /** Whether the child's branch offers online payment through the gateway. */
  gatewayEnabled?: boolean;
};

/** Pure rendering of the guardian home; the page loads the data, previews can pass fixtures. */
export default function DashboardView({ guardianName, child, childQuery, invoices, activities, gatewayEnabled = false }: DashboardViewProps) {
  const openBill = latestOpenInvoice(invoices);
  const [latest, ...more] = recentActivities(activities, 4);
  const latestImage = latest?.imageUrls?.[0];
  const nickname = child.nickname || child.firstName;

  return (
    <div className="dashboard-page gd">
      <header className="gd-welcome">
        <div>
          <p className="eyebrow">{currentDate()}</p>
          <h1>{greetingFor()}, {guardianName}! <span aria-hidden="true">👋</span></h1>
          <p>Tagihan, laporan, dan foto kegiatan {nickname} dalam satu tempat.</p>
        </div>
        <Link className="gd-child panel" href={`/dashboard/activities${childQuery}`}>
          <span className="gd-child-avatar">{child.initials}</span>
          <span className="gd-child-copy">
            <strong>{child.name}</strong>
            <small>{child.className} · NIS {child.nis}</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      <section className="gd-grid">
        <article className={`panel gd-bill fee-card ${openBill?.state === "unpaid" ? "due" : openBill ? "waiting" : "settled"}`} aria-labelledby="dashboard-bill-title">
          <div className="gd-card-head">
            <div><span className="gd-kicker">SPP &amp; TAGIHAN</span><h2 id="dashboard-bill-title">{openBill?.state === "unpaid" ? "Tagihan menunggu pembayaran" : openBill ? "Pembayaran sedang diperiksa" : "Tagihan terbaru"}</h2></div>
            <span className="gd-card-icon"><ReceiptText aria-hidden="true" /></span>
          </div>
          {!invoices ? (
            <p className="fine-note">Tagihan belum dapat dimuat saat ini. Silakan coba lagi beberapa saat.</p>
          ) : openBill ? (
            <>
              <div className="gd-bill-amount">
                <span>{openBill.invoice.feeType} · {openBill.invoice.month}</span>
                <strong>{openBill.invoice.amount}</strong>
                <small><Clock3 aria-hidden="true" /> Jatuh tempo {openBill.invoice.dueDate}</small>
              </div>
              {openBill.invoice.rejectionReason && (
                <div className="payment-rejection-message" role="alert">
                  <p><strong>Pembayaran sebelumnya ditolak.</strong> {openBill.invoice.rejectionReason}</p>
                </div>
              )}
              {openBill.state === "unpaid" ? (
                <>
                  <InvoicePaymentActions child={child} invoice={openBill.invoice} gatewayEnabled={gatewayEnabled} childQuery={childQuery} triggerId={PAY_TRIGGER_ID} />
                  <p className="gd-bill-hint">{gatewayEnabled ? "Bayar online agar tagihan langsung lunas, atau transfer ke rekening sekolah lalu unggah buktinya. Verifikasi manual biasanya selesai dalam 1 hari kerja." : "Transfer ke rekening sekolah, lalu unggah buktinya di sini. Verifikasi biasanya selesai dalam 1 hari kerja."}</p>
                  <BillReminderDialog childName={nickname} feeType={openBill.invoice.feeType} month={openBill.invoice.month} amount={openBill.invoice.amount} dueDate={openBill.invoice.dueDate} detailHref={`/dashboard/payments/${openBill.invoice.slug}${childQuery}`} triggerId={PAY_TRIGGER_ID} />
                </>
              ) : (
                <PaymentVerificationStatus live={false} />
              )}
              <nav className="gd-bill-links" aria-label="Tautan tagihan">
                <Link href={`/dashboard/payments/${openBill.invoice.slug}${childQuery}`}>Detail tagihan <ArrowRight aria-hidden="true" /></Link>
                <Link href={`/dashboard/payments${childQuery}`}>Riwayat pembayaran <ArrowRight aria-hidden="true" /></Link>
              </nav>
            </>
          ) : (
            <>
              <div className="bill-settled gd-settled" role="status">
                <CheckCircle2 aria-hidden="true" />
                <div><strong>Semua tagihan sudah lunas</strong><p>Terima kasih! Tidak ada tagihan {nickname} yang menunggu pembayaran.</p></div>
              </div>
              <nav className="gd-bill-links" aria-label="Tautan tagihan">
                <Link href={`/dashboard/payments${childQuery}`}>Riwayat pembayaran <ArrowRight aria-hidden="true" /></Link>
              </nav>
            </>
          )}
        </article>

        <article className="panel gd-report activity-feed" aria-labelledby="dashboard-activity-title">
          <div className="gd-card-head">
            <div><span className="gd-kicker">LAPORAN TERBARU</span><h2 id="dashboard-activity-title">Cerita {nickname} di sekolah</h2></div>
            <span className="gd-card-icon sun"><Sparkles aria-hidden="true" /></span>
          </div>
          {latest ? (
            <Link className="gd-feature" href={`/dashboard/activities/${latest.slug}${childQuery}`}>
              <div className={`gd-feature-art ${latest.tone}`}>
                {latestImage ? (
                  <PresignedImage src={latestImage} alt={latest.title} />
                ) : (
                  <span>{latest.emoji}</span>
                )}
                <b><Images aria-hidden="true" /> {latest.photos} foto</b>
              </div>
              <div className="gd-feature-copy">
                <span className="activity-date"><CalendarDays aria-hidden="true" /> {latest.date}{latest.time ? ` · ${latest.time}` : ""}</span>
                <h3>{latest.title}</h3>
                <p>{latest.summary}</p>
                <span className="teacher-note"><Sparkles aria-hidden="true" /> Dibagikan oleh {latest.teacher}</span>
                <span className="gd-feature-cta">Baca laporan <ArrowRight aria-hidden="true" /></span>
              </div>
            </Link>
          ) : (
            <div className="gd-empty"><span aria-hidden="true">🌱</span><strong>Belum ada laporan</strong><p>Guru belum membagikan kegiatan {nickname}. Laporan akan muncul di sini begitu tersedia.</p></div>
          )}
          {more.length > 0 && (
            <ul className="gd-more">
              {more.map((activity) => (
                <li key={activity.slug}>
                  <Link href={`/dashboard/activities/${activity.slug}${childQuery}`}>
                    <span className={`gd-more-thumb ${activity.tone}`}>{activity.imageUrls?.[0] ? (
                      <PresignedImage src={activity.imageUrls[0]} alt="" />
                    ) : activity.emoji}</span>
                    <span className="gd-more-copy"><strong>{activity.title}</strong><small>{activity.date} · {activity.photos} foto</small></span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link className="primary-button full-button dashboard-secondary-link" href={`/dashboard/activities${childQuery}`}>Lihat semua laporan {nickname} <ArrowRight aria-hidden="true" /></Link>
        </article>
      </section>
    </div>
  );
}
