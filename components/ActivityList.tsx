"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ActivityDatePicker from "@/components/ActivityDatePicker";
import type { Activity, ChildProfile } from "@/lib/data";
import {
  filterActivitiesByDate,
  formatDayKey,
  formatSchoolWeek,
  isDayKey,
  shiftDay,
  todayKey,
} from "@/lib/activityFilter";
import {
  ACTIVITY_PAGE_SIZE,
  applyActivityListState,
  dateFilterOf,
  parseActivityListState,
  type ActivityListState,
} from "@/lib/activityListState";

export default function ActivityList({ items, child }: { items: readonly Activity[]; child: ChildProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [slides, setSlides] = useState<Record<string, number>>({});
  // The filter, search and how many cards are loaded live in the URL, so the
  // back button from a detail page (or a shared link) restores the same view.
  const state = useMemo(() => parseActivityListState(searchParams), [searchParams]);
  const { mode, date, shown, query } = state;
  const filtered = useMemo(
    () => filterActivitiesByDate(items, dateFilterOf(state)).filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())),
    [items, state, query],
  );
  const visibleItems = filtered.slice(0, shown);
  const remaining = filtered.length - visibleItems.length;

  function update(changes: Partial<ActivityListState>) {
    // Any change to what is listed starts again from the first page of cards.
    const next = { ...state, shown: ACTIVITY_PAGE_SIZE, ...changes };
    router.replace(`${pathname}?${applyActivityListState(new URLSearchParams(searchParams), next).toString()}`, { scroll: false });
  }
  const setQuery = (value: string) => update({ query: value });
  const updateMode = (value: ActivityListState["mode"]) => update({ mode: value });
  const updateDate = (value: string) => { if (isDayKey(value)) update({ date: value }); };
  const loadMore = () => update({ shown: shown + ACTIVITY_PAGE_SIZE });
  const step = mode === "week" ? 7 : 1;
  const selectionLabel = mode === "day" ? formatDayKey(date) : mode === "week" ? formatSchoolWeek(date) : "";
  const emptyCopy = mode === "all" ? "Coba gunakan kata kunci yang berbeda." : query ? `Tidak ada aktivitas yang cocok pada ${selectionLabel}.` : `Belum ada aktivitas yang dibagikan pada ${selectionLabel}.`;

  function downloadActivity(activity: Activity, activeImage?: string) {
    const slide = slides[activity.slug] || 0;
    if (activeImage) {
      const link = document.createElement("a");
      link.href = activeImage;
      link.download = `${activity.slug}-${slide + 1}`;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
      return;
    }
    const emoji = slide ? activity.secondaryEmoji : activity.emoji;
    const colors = activity.tone === "mint" ? ["#bcebcf", "#88cfae"] : activity.tone === "lavender" ? ["#d5c4f2", "#a58ddb"] : activity.tone === "blue" ? ["#b8d9f5", "#82afd9"] : ["#ffdb98", "#f5a18e"];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="1080" cy="60" r="240" fill="none" stroke="white" stroke-opacity=".22" stroke-width="65"/><text x="600" y="500" text-anchor="middle" font-size="190">${emoji}</text><text x="54" y="835" fill="#153128" font-family="Arial" font-size="38" font-weight="700">${activity.title} · ${child.name}</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activity.slug}-${slide + 1}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="activity-filters">
        <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari aktivitas ${child.name}...`} /></label>
        <div className="activity-date-filter" role="group" aria-label="Filter tanggal aktivitas">
          <div className="segmented" role="radiogroup" aria-label="Rentang waktu">
            {([["all", "Semua"], ["day", "Per hari"], ["week", "Per minggu"]] as const).map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={mode === value} className={mode === value ? "active" : ""} onClick={() => updateMode(value)}>{label}</button>
            ))}
          </div>
          {mode !== "all" && (
            <div className="date-picker">
              <button type="button" aria-label={mode === "week" ? "Minggu sebelumnya" : "Hari sebelumnya"} onClick={() => updateDate(shiftDay(date, -step))}><ChevronLeft /></button>
              <ActivityDatePicker mode={mode} value={date} onChange={updateDate} />
              <button type="button" aria-label={mode === "week" ? "Minggu berikutnya" : "Hari berikutnya"} onClick={() => updateDate(shiftDay(date, step))}><ChevronRight /></button>
              <button type="button" className="date-reset" onClick={() => updateDate(todayKey())}>Hari ini</button>
            </div>
          )}
        </div>
        {mode !== "all" && (
          <p className="activity-filter-summary" role="status">
            <strong>{selectionLabel}</strong>
            {mode === "week" && <span> · Senin sampai Jumat</span>}
            <span> · {filtered.length} aktivitas</span>
            <button type="button" onClick={() => updateMode("all")}><X aria-hidden="true" /> Tampilkan semua</button>
          </p>
        )}
      </div>
      <div className="guardian-social-feed">
        {visibleItems.map((activity) => {
          const slide = slides[activity.slug] || 0;
          const images = activity.imageUrls || [];
          const totalImages = images.length || 1;
          const currentImage = images[slide % totalImages];
          return (
            <article className="social-post panel" key={activity.slug}>
              <header><span className="post-avatar">{activity.teacher.replace("Bu ", "B").slice(0, 2)}</span><div><strong>{activity.teacher}</strong><small>{child.className} · {activity.date}, {activity.time}</small></div><b>✓ {child.name} ditandai</b></header>
              <div className={`post-carousel ${activity.tone}`}>
                {currentImage ? <img className="post-image" src={currentImage} alt={`${activity.title} ${slide + 1}`} /> : <span className="post-scene" aria-label={`${child.name} mengikuti ${activity.title}`}>{slide ? activity.secondaryEmoji : activity.emoji}</span>}
                {images.length > 1 && <><button type="button" aria-label="Foto sebelumnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: (slide - 1 + images.length) % images.length }))}><ChevronLeft /></button><button type="button" aria-label="Foto berikutnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: (slide + 1) % images.length }))}><ChevronRight /></button><span className="post-counter">{slide + 1}/{images.length}</span><div className="post-dots">{images.map((_, index) => <i key={index} className={slide === index ? "active" : ""} />)}</div></>}
              </div>
              <div className="post-content">
                <div className="post-action-row">
                  <button type="button" aria-label={`Unduh foto ${activity.title}`} onClick={() => downloadActivity(activity, currentImage)}><Download /></button>
                </div>
                <p><b>{activity.title}</b> {activity.description}</p>
                <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <Link className="post-detail-link" href={`/dashboard/activities/${activity.slug}`}>Baca catatan lengkap</Link>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Aktivitas tidak ditemukan</h2><p>{emptyCopy}</p></div>}
      {filtered.length > ACTIVITY_PAGE_SIZE && (
        <div className="load-more" role="status">
          <span>Menampilkan {visibleItems.length} dari {filtered.length} aktivitas</span>
          {remaining > 0 && <button type="button" className="outline-button" onClick={loadMore}>Tampilkan lebih banyak ({Math.min(remaining, ACTIVITY_PAGE_SIZE)} lagi)</button>}
        </div>
      )}
    </>
  );
}
