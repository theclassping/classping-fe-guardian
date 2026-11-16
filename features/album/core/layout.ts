// Page geometry in PDF points, shared by the DOM preview and the PDF so both place every polaroid at the same spot.
import { PAGE } from "./theme";
import type { ActivityEntry, PhotoLayout } from "./types";

export type Rect = { x: number; y: number; width: number; height: number };

/** Polaroid frame: a 4:3 photo with a thin top edge and a caption strip below. */
export const POLAROID = { top: 10, side: 10, strip: 40, ratio: 0.75 } as const;

export function polaroidHeight(width: number) {
  const photoWidth = width - POLAROID.side * 2;
  return POLAROID.top + photoWidth * POLAROID.ratio + POLAROID.strip;
}

export const CONTENT = { x: PAGE.margin, width: PAGE.width - PAGE.margin * 2 } as const;

/** Where each polaroid sits for a layout, centred in a box of the content width starting at `top`. */
export function photoSlots(layout: PhotoLayout, top: number, count: number, compact = false): Rect[] {
  const columns = layout === "hero" ? 1 : layout === "pair" ? 2 : layout === "grid4" ? 2 : 3;
  const width = compact ? (layout === "hero" ? 230 : layout === "pair" ? 200 : 160) : layout === "hero" ? 340 : layout === "pair" ? 246 : layout === "grid4" ? 232 : 160;
  const gap = layout === "grid6" ? 12 : 20;
  const rowWidth = columns * width + (columns - 1) * gap;
  const left = CONTENT.x + (CONTENT.width - rowWidth) / 2;
  const height = polaroidHeight(width);
  return Array.from({ length: count }, (_, index) => ({
    x: left + (index % columns) * (width + gap),
    y: top + Math.floor(index / columns) * (height + gap),
    width,
    height,
  }));
}

export function slotsHeight(slots: Rect[]) {
  return slots.length ? Math.max(...slots.map((slot) => slot.y + slot.height)) - Math.min(...slots.map((slot) => slot.y)) : 0;
}

/** Fixed vertical bands of an activity page. */
export const ACTIVITY_PAGE = {
  headerTop: PAGE.margin,
  headerHeight: 86,
  photosTop: PAGE.margin + 100,
  /** The remark bubble is pinned to the bottom of the page. */
  bubbleHeight: 92,
  bubbleBottom: PAGE.margin,
} as const;

/** The two halves of a page that shows two short activities. */
export function halfBands() {
  const innerHeight = PAGE.height - PAGE.margin * 2;
  const half = (innerHeight - 16) / 2;
  return [
    { top: PAGE.margin, height: half },
    { top: PAGE.margin + half + 16, height: half },
  ];
}

/** Whether the entry's photos plus its text fit with the standard layout (they always do by construction; kept for clarity). */
export function entryPhotoSlots(entry: ActivityEntry, top: number, compact: boolean) {
  return photoSlots(entry.layout, top, entry.photos.length, compact);
}
