"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function ActivityMediaSlider({ images, emoji, title }: { images?: string[]; emoji: string; title: string }) {
  const [index, setIndex] = useState(0);
  const media = images?.length ? images : [];
  const total = Math.max(1, media.length);
  const current = media[index] || "";
  return <div className="detail-media-slider">
    {current ? <img src={current} alt={`${title} ${index + 1}`} /> : <span className="detail-media-fallback">{emoji}</span>}
    {total > 1 && <><button type="button" aria-label="Foto sebelumnya" onClick={() => setIndex((value) => (value - 1 + total) % total)}><ChevronLeft /></button><button type="button" aria-label="Foto berikutnya" onClick={() => setIndex((value) => (value + 1) % total)}><ChevronRight /></button><span className="detail-media-counter">{index + 1}/{total}</span></>}
  </div>;
}
