"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Assessment } from "@/lib/data";

export default function AssessmentList({ items }: { items: readonly Assessment[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.period}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return (
    <>
      <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari laporan penilaian..." /></label>
      <div className="assessment-list">
        {filtered.map((assessment) => (
          <Link className="assessment-list-card panel" href={`/dashboard/assessments/${assessment.slug}`} key={assessment.slug}>
            <span className="report-icon"><CheckCircle2 /></span>
            <div><span className="ready-chip">{assessment.status}</span><h2>{assessment.title}</h2><small>{assessment.period} · oleh {assessment.teacher}</small><p>{assessment.summary}</p></div>
            <ArrowRight />
          </Link>
        ))}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Laporan tidak ditemukan</h2><p>Coba gunakan kata kunci yang berbeda.</p></div>}
    </>
  );
}
