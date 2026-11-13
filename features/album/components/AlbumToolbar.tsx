"use client";

// Period picker and download buttons; the chosen period lives in the URL so the PDF links and the preview agree.
import { Download } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { monthLabel, periodLabel, periodParam, type AcademicYearOption, type Period } from "classping-album/period";

export type PeriodChoice = { value: string; label: string };

export default function AlbumToolbar({ period, months, years, pageCount, photoCount, downloadParts }: {
  period: Period;
  months: { year: number; month: number }[];
  years: AcademicYearOption[];
  pageCount: number;
  photoCount: number;
  /** One entry when the album fits a single PDF; several consecutive parts when it does not. */
  downloadParts: PeriodChoice[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [downloading, setDownloading] = useState<string | null>(null);
  const current = periodParam(period);
  const choices: PeriodChoice[] = [
    ...months.map(({ year, month }) => ({ value: periodParam({ kind: "month", year, month }), label: monthLabel(year, month) })),
    ...years.map((year) => ({ value: `year:${year.id}`, label: `Tahun Ajaran ${year.label}` })),
  ];
  if (!choices.some((choice) => choice.value === current)) choices.unshift({ value: current, label: periodLabel(period) });

  function choose(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function startDownload(value: string) {
    setDownloading(value);
    setTimeout(() => setDownloading((active) => (active === value ? null : active)), 8000);
  }

  const parts = downloadParts.length ? downloadParts : [{ value: current, label: periodLabel(period) }];
  return (
    <div className="al-toolbar panel">
      <label>
        <span>Periode</span>
        <select value={current} onChange={(event) => choose(event.target.value)}>
          {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
      </label>
      <p>{pageCount} halaman · {photoCount} foto</p>
      {parts.length === 1 ? (
        <a className="primary-button" href={`/api/album?period=${encodeURIComponent(parts[0].value)}`} download onClick={() => startDownload(parts[0].value)} aria-busy={downloading === parts[0].value}>
          <Download /> {downloading === parts[0].value ? "Menyiapkan PDF…" : "Unduh PDF"}
        </a>
      ) : (
        <div className="al-download-parts">
          <small>Album ini besar, jadi diunduh dalam {parts.length} berkas PDF.</small>
          <div>
            {parts.map((part, index) => (
              <a key={part.value} className="primary-button" href={`/api/album?period=${encodeURIComponent(part.value)}`} download onClick={() => startDownload(part.value)} aria-busy={downloading === part.value}>
                <Download /> {downloading === part.value ? "Menyiapkan…" : `Bagian ${index + 1}: ${part.label}`}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
