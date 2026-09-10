"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Activity, ChildProfile } from "@/lib/data";

export default function ActivityList({ items, child }: { items: readonly Activity[]; child: ChildProfile }) {
  const [query, setQuery] = useState("");
  const [slides, setSlides] = useState<Record<string, number>>({});
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  function downloadActivity(activity: Activity) {
    const slide = slides[activity.slug] || 0;
    const emoji = slide ? activity.secondaryEmoji : activity.emoji;
    const colors = activity.tone === "mint" ? ["#bcebcf", "#88cfae"] : activity.tone === "lavender" ? ["#d5c4f2", "#a58ddb"] : activity.tone === "blue" ? ["#b8d9f5", "#82afd9"] : ["#ffdb98", "#f5a18e"];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="1080" cy="60" r="240" fill="none" stroke="white" stroke-opacity=".22" stroke-width="65"/><text x="600" y="500" text-anchor="middle" font-size="190">${emoji}</text><text x="54" y="835" fill="#153128" font-family="Arial" font-size="38" font-weight="700">${activity.title} · ${child.firstName}</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activity.slug}-${slide + 1}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari aktivitas ${child.firstName}...`} /></label>
      <div className="guardian-social-feed">
        {filtered.map((activity) => {
          const slide = slides[activity.slug] || 0;
          return (
            <article className="social-post panel" key={activity.slug}>
              <header><span className="post-avatar">{activity.teacher.replace("Bu ", "B").slice(0, 2)}</span><div><strong>{activity.teacher}</strong><small>Kelas {child.className} · {activity.date}, {activity.time}</small></div><b>✓ {child.firstName} ditandai</b></header>
              <div className={`post-carousel ${activity.tone}`}>
                <span className="post-scene" aria-label={`${child.firstName} mengikuti ${activity.title}`}>{slide ? activity.secondaryEmoji : activity.emoji}</span>
                <button type="button" aria-label="Foto sebelumnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: slide ? 0 : 1 }))}><ChevronLeft /></button>
                <button type="button" aria-label="Foto berikutnya" onClick={() => setSlides((current) => ({ ...current, [activity.slug]: slide ? 0 : 1 }))}><ChevronRight /></button>
                <span className="post-counter">{slide + 1}/2</span><div className="post-dots"><i className={slide === 0 ? "active" : ""} /><i className={slide === 1 ? "active" : ""} /></div>
              </div>
              <div className="post-content">
                <div className="post-action-row">
                  <button type="button" aria-label={`Unduh foto ${activity.title}`} onClick={() => downloadActivity(activity)}><Download /></button>
                </div>
                <p><b>{activity.title}</b> {activity.description}</p>
                <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                <Link className="post-detail-link" href={`/dashboard/activities/${activity.slug}?child=${child.id}`}>Baca catatan lengkap</Link>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Aktivitas tidak ditemukan</h2><p>Coba gunakan kata kunci yang berbeda.</p></div>}
    </>
  );
}
