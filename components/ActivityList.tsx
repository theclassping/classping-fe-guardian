"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Camera, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Activity } from "@/lib/data";

export default function ActivityList({ items }: { items: readonly Activity[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  return (
    <>
      <label className="list-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari aktivitas Alya..." /></label>
      <div className="card-grid">
        {filtered.map((activity) => (
          <Link className="activity-card panel" href={`/dashboard/activities/${activity.slug}`} key={activity.slug}>
            <div className={`activity-art ${activity.tone}`}><span>{activity.emoji}</span><b><Camera /> {activity.photos} foto</b></div>
            <div className="activity-card-body">
              <span className="activity-date"><CalendarDays /> {activity.date} · {activity.time}</span>
              <h2>{activity.title}</h2>
              <p>{activity.summary}</p>
              <div className="tag-list">{activity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <strong className="card-link">Lihat cerita <ArrowRight /></strong>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && <div className="empty-state panel"><span>🔎</span><h2>Aktivitas tidak ditemukan</h2><p>Coba gunakan kata kunci yang berbeda.</p></div>}
    </>
  );
}
