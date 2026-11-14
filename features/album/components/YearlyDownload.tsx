"use client";

// Yearly album: built once in the background and stored, then downloaded instantly; rebuilt when the school changes photos.
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { JobView } from "@/app/api/album/jobs/route";

const POLL_MS = 3000;

function sizeLabel(bytes: number | null) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function dateLabel(iso?: string) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

export default function YearlyDownload({ period, photoCount }: { period: string; photoCount: number }) {
  const [job, setJob] = useState<JobView | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const request = useCallback(async (check: boolean) => {
    const response = await fetch(`/api/album/jobs?period=${encodeURIComponent(period)}${check ? "&check=1" : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { detail?: string }).detail || "Tidak dapat membaca status album.");
    return (await response.json()) as JobView;
  }, [period]);
  const failed = (error: unknown) => setMessage(error instanceof Error ? error.message : "Tidak dapat membaca status album.");

  // The toolbar keys this component by period, so a period change mounts a fresh one.
  useEffect(() => {
    let active = true;
    request(true).then((next) => active && setJob(next), (error) => active && failed(error));
    return () => {
      active = false;
    };
  }, [request]);

  const building = job?.status === "pending" || job?.status === "building";
  useEffect(() => {
    if (!building) return;
    const timer = setTimeout(() => request(false).then(setJob, failed), POLL_MS);
    return () => clearTimeout(timer);
  }, [building, job, request]);

  async function start() {
    setStarting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/album/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
      const payload = (await response.json().catch(() => ({}))) as JobView & { detail?: string };
      if (!response.ok) throw new Error(payload.detail || "Tidak dapat memulai pembuatan album.");
      setJob(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tidak dapat memulai pembuatan album.");
    } finally {
      setStarting(false);
    }
  }

  if (!job) {
    return (
      <div className="al-yearly" aria-live="polite">
        <small>{message ?? "Memeriksa album tersimpan…"}</small>
      </div>
    );
  }

  const parts = job.parts;
  const done = parts.filter((part) => part.status === "ready").length;
  const photosDone = parts.filter((part) => part.status === "ready").reduce((sum, part) => sum + part.photos, 0);
  const canStart = !building && !starting && photoCount > 0;

  if (building) {
    return (
      <div className="al-yearly" aria-live="polite">
        <small>Menyiapkan album tahunan · bagian {Math.min(done + 1, parts.length)} dari {parts.length} · {photosDone} dari {job.photoCount} foto</small>
        <progress max={Math.max(job.photoCount, 1)} value={photosDone} />
        <small>Anda boleh meninggalkan halaman ini; album tetap disiapkan.</small>
      </div>
    );
  }

  if (job.status === "ready") {
    return (
      <div className="al-yearly" aria-live="polite">
        {job.stale ? (
          <small data-tone="warn">Sekolah menambah atau mengubah foto sejak album ini dibuat ({dateLabel(job.updatedAt)}).</small>
        ) : (
          <small>Album tahunan siap · dibuat {dateLabel(job.updatedAt)}{parts.length > 1 ? ` · ${parts.length} berkas PDF` : ""}</small>
        )}
        <div>
          {parts.map((part) => (
            <a key={part.index} className="primary-button" href={`/api/album/jobs/${job.id}/parts/${part.index}`} download>
              <Download /> {parts.length > 1 ? part.label : "Unduh PDF"}{part.bytes ? ` (${sizeLabel(part.bytes)})` : ""}
            </a>
          ))}
          {job.stale ? (
            <button type="button" className="secondary-button" onClick={start} disabled={!canStart}>
              <RefreshCw /> {starting ? "Memulai…" : "Perbarui album"}
            </button>
          ) : null}
        </div>
        {message ? <small data-tone="error">{message}</small> : null}
      </div>
    );
  }

  return (
    <div className="al-yearly" aria-live="polite">
      {job.status === "failed" ? <small data-tone="error">{job.error || "Pembuatan album gagal."} Coba lagi.</small> : (
        <small>{photoCount} foto · album tahunan disiapkan sekali, lalu bisa diunduh kapan saja.</small>
      )}
      <div>
        <button type="button" className="primary-button" onClick={start} disabled={!canStart}>
          <Sparkles /> {starting ? "Memulai…" : job.status === "failed" ? "Coba buat lagi" : "Siapkan album tahunan"}
        </button>
      </div>
      {message ? <small data-tone="error">{message}</small> : null}
    </div>
  );
}
