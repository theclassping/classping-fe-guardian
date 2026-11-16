"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ActivityDatePicker from "@/features/activities/components/ActivityDatePicker";
import PresignedImage from "@/components/PresignedImage";
import type { Activity } from "@/features/activities/types";
import type { ChildProfile } from "@/features/family/types";
import {
  filterActivitiesByDate,
  formatSelection,
  isDayKey,
  lastThirtyDaysStart,
  RANGE_DAYS,
  shiftDay,
  todayKey,
} from "@/features/activities/filter";
import {
  ACTIVITY_PAGE_SIZE,
  applyActivityListState,
  dateFilterOf,
  parseActivityListState,
  type ActivityListState,
} from "@/features/activities/list-state";

export default function ActivityList({ items, child }: { items: readonly Activity[]; child: ChildProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [slides, setSlides] = useState<Record<string, number>>({});
  // Phones hide the search field behind an icon until it is needed.
  const [searchOpen, setSearchOpen] = useState(false);
  // The filter, search and how many cards are loaded live in the URL, so the
  // back button from a detail page (or a shared link) restores the same view.
  const state = useMemo(() => parseActivityListState(searchParams), [searchParams]);
  const { mode, date, shown, query } = state;
  const filtered = useMemo(
    () => filterActivitiesByDate(items, dateFilterOf(state)).filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())),
    [items, state, query],
  );
  const visibleItems = filtered.slice(0, shown);
  const photoCount = filtered.reduce((total, item) => total + item.photos, 0);
  const remaining = filtered.length - visibleItems.length;

  function update(changes: Partial<ActivityListState>) {
    // Any change to what is listed starts again from the first page of cards.
    const next = { ...state, shown: ACTIVITY_PAGE_SIZE, ...changes };
    router.replace(`${pathname}?${applyActivityListState(new URLSearchParams(searchParams), next).toString()}`, { scroll: false });
  }
  const setQuery = (value: string) => update({ query: value });
  // The 30-day view opens on the 30 days ending today; leaving it returns to today.
  const updateMode = (value: ActivityListState["mode"]) => update(
    value === "range" ? { mode: value, date: lastThirtyDaysStart() } : mode === "range" ? { mode: value, date: todayKey() } : { mode: value },
  );
  const updateDate = (value: string) => { if (isDayKey(value)) update({ date: value }); };
  const loadMore = () => update({ shown: shown + ACTIVITY_PAGE_SIZE });
  const step = mode === "week" ? 7 : mode === "range" ? RANGE_DAYS : 1;
  const unit = mode === "week" ? "Minggu" : mode === "range" ? "30 hari" : "Hari";
  const selectionLabel = mode === "all" ? "" : formatSelection(mode, date);
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
        <label className={`list-search${searchOpen || query ? " is-open" : ""}`}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari aktivitas ${child.firstName}...`} /></label>
        <div className="activity-date-filter" role="group" aria-label="Filter tanggal aktivitas">
          <div className="segmented" role="radiogroup" aria-label="Rentang waktu">
            {([["all", "Semua", "Semua"], ["day", "Per hari", "Hari"], ["week", "Per minggu", "Minggu"], ["range", "30 hari", "30 hari"]] as const).map(([value, label, short]) => (
              <button key={value} type="button" role="radio" aria-checked={mode === value} className={mode === value ? "active" : ""} onClick={() => updateMode(value)}><span className="label-long">{label}</span><span className="label-short">{short}</span></button>
            ))}
          </div>
          <button type="button" className="search-toggle" aria-label={searchOpen ? "Tutup pencarian" : "Cari aktivitas"} aria-pressed={searchOpen} onClick={() => setSearchOpen((value) => !value)}>{searchOpen ? <X /> : <Search />}</button>
          {mode !== "all" && (
            <div className="date-picker">
              <button type="button" aria-label={`${unit} sebelumnya`} onClick={() => updateDate(shiftDay(date, -step))}><ChevronLeft /></button>
              <ActivityDatePicker mode={mode} value={date} onChange={updateDate} />
              <button type="button" aria-label={`${unit} berikutnya`} onClick={() => updateDate(shiftDay(date, step))}><ChevronRight /></button>
              <button type="button" className="date-reset" onClick={() => updateDate(mode === "range" ? lastThirtyDaysStart() : todayKey())}>{mode === "range" ? "30 hari terakhir" : "Hari ini"}</button>
            </div>
          )}
        </div>
        <p className="activity-filter-summary" role="status">
          {mode !== "all" && <strong className="summary-selection">{selectionLabel}</strong>}
          {mode === "week" && <span className="summary-hint"> · Senin sampai Jumat</span>}
          {mode === "range" && <span className="summary-hint"> · {RANGE_DAYS} hari</span>}
          <span className="summary-count">{mode !== "all" && <span className="summary-hint"> · </span>}{filtered.length} aktivitas · {photoCount} foto</span>
          {mode !== "all" && <button type="button" className="summary-reset" onClick={() => updateDate(mode === "range" ? lastThirtyDaysStart() : todayKey())}>{mode === "range" ? "30 hari terakhir" : "Hari ini"}</button>}
          {mode !== "all" && <button type="button" onClick={() => updateMode("all")}><X aria-hidden="true" /> Tampilkan semua</button>}
        </p>
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
                {currentImage ? <PresignedImage className="post-image" src={currentImage} alt={`${activity.title} ${slide + 1}`} /> : <span className="post-scene" aria-label={`${child.name} mengikuti ${activity.title}`}>{slide ? activity.secondaryEmoji : activity.emoji}</span>}
                {images.length > 1 && <><button type="button" aria-label="Foto sebelumnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: (slide - 1 + images.length) % images.length }))}><ChevronLeft /></button><button type="button" aria-label="Foto berikutnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: (slide + 1) % images.length }))}><ChevronRight /></button><span className="post-counter">{slide + 1}/{images.length}</span><div className="post-dots">{images.map((_, index) => <i key={index} className={slide === index ? "active" : ""} />)}</div></>}
              </div>
              <div className="post-content">
                <h3 className="post-title">{activity.title}</h3>
                <p className="post-text">{activity.description}</p>
                <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <div className="post-footer">
                  <Link className="post-detail-link" href={`/dashboard/activities/${activity.slug}`}>Baca catatan lengkap</Link>
                  <button type="button" aria-label={`Unduh foto ${activity.title}`} onClick={() => downloadActivity(activity, currentImage)}><Download /></button>
                </div>
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
