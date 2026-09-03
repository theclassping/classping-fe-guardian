"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChildId, Invoice } from "@/lib/data";

export default function PaymentList({ items, childId }: { items: readonly Invoice[]; childId: ChildId }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => items.filter((item) => {
    const matchesQuery = item.month.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || (status === "paid" ? item.status.startsWith("Lunas") : !item.status.startsWith("Lunas"));
    return matchesQuery && matchesStatus;
  }), [items, query, status]);

  return (
    <>
      <div className="payment-tools panel">
        <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari bulan tagihan..." /></label>
        <select aria-label="Filter status pembayaran" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua status</option><option value="unpaid">Belum dibayar</option><option value="paid">Lunas</option></select>
      </div>
      <div className="payment-list panel">
        <div className="payment-row payment-row-head"><span>Periode</span><span>Jumlah</span><span>Jatuh tempo</span><span>Status</span><span /></div>
        {filtered.map((invoice) => <Link className="payment-row" href={`/dashboard/payments/${invoice.slug}?child=${childId}`} key={invoice.slug}><strong>{invoice.month}</strong><span>{invoice.amount}</span><span>{invoice.dueDate}</span><span className={`status-badge ${invoice.statusTone}`}>{invoice.status}</span><ArrowRight /></Link>)}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Tagihan tidak ditemukan</h2><p>Ubah pencarian atau filter status.</p></div>}
    </>
  );
}
