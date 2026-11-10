"use client";

import Link from "next/link";
import { ArrowRight, BellRing, Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Set by the login form; the reminder shows once per login, then clears it. */
export const FRESH_LOGIN_KEY = "classping:guardian:fresh-login";

export default function BillReminderDialog({ childName, feeType, month, amount, dueDate, detailHref, triggerId }: {
  childName: string; feeType: string; month: string; amount: string; dueDate: string; detailHref: string; triggerId: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read first, clear only once the dialog is actually opening, so a
    // development double-invocation of this effect cannot swallow the flag.
    let fresh = false;
    try { fresh = sessionStorage.getItem(FRESH_LOGIN_KEY) === "1"; } catch { fresh = false; }
    if (!fresh) return;
    const timer = window.setTimeout(() => {
      try { sessionStorage.removeItem(FRESH_LOGIN_KEY); } catch { /* The reminder still opens this once. */ }
      setOpen(true);
    }, 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!open) return null;

  function continuePayment() {
    setOpen(false);
    const trigger = document.getElementById(triggerId);
    if (!(trigger instanceof HTMLButtonElement) || trigger.disabled) { window.location.href = detailHref; return; }
    trigger.scrollIntoView({ block: "center", behavior: "smooth" });
    window.setTimeout(() => trigger.click(), 250);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="bill-reminder" role="dialog" aria-modal="true" aria-labelledby="bill-reminder-title" aria-describedby="bill-reminder-copy">
        <button className="bill-reminder-close" type="button" aria-label="Tutup" onClick={() => setOpen(false)}><X /></button>
        <div className="bill-reminder-art" aria-hidden="true"><i className="a" /><i className="b" /><BellRing /></div>
        <p className="eyebrow">PENGINGAT TAGIHAN</p>
        <h2 id="bill-reminder-title">Ada tagihan {childName} yang belum dibayar</h2>
        <p id="bill-reminder-copy">{feeType} {month} sebesar <strong>{amount}</strong> masih menunggu pembayaran. Unggah bukti transfer agar sekolah bisa segera memverifikasinya.</p>
        <p className="bill-reminder-due"><Clock3 aria-hidden="true" /> Jatuh tempo {dueDate}</p>
        <div className="bill-reminder-actions">
          <button className="primary-button" type="button" onClick={continuePayment}>Lanjutkan pembayaran <ArrowRight aria-hidden="true" /></button>
          <Link className="outline-button" href={detailHref} onClick={() => setOpen(false)}>Lihat detail tagihan</Link>
          <button className="bill-reminder-later" type="button" onClick={() => setOpen(false)}>Nanti saja</button>
        </div>
      </section>
    </div>
  );
}
