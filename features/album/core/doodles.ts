// Hand-drawn-looking shapes scattered around the photos, like a children's magazine spread (viewBox 0 0 24 24).
import type { Rect } from "./layout";
import { unit } from "./seed";
import { TONES, type Tone } from "./theme";

export type DoodleName = "rainCloud" | "tulip" | "leafStalk" | "squiggle" | "loops" | "blob" | "car" | "house" | "lollipopTree" | "zigzag";

/** `stroke` shapes are drawn as a thick round line; the rest are filled. */
export const DOODLE_PATHS: Record<DoodleName, { d: string; stroke?: boolean }> = {
  rainCloud: { d: "M6 13a4 4 0 0 1-.5-7.96A5.5 5.5 0 0 1 16.3 4.5 3.5 3.5 0 0 1 17 13H6zM7 16l-1.5 3.5h2L9 16zm4.5 0L10 19.5h2l1.5-3.5zm4.5 0l-1.5 3.5h2L18 16z" },
  tulip: { d: "M11 22v-9h2v9zM12 2.5l3.5 2.5V10a3.5 3.5 0 0 1-7 0V5zM5.5 12c2.8 0 5 1.6 5.5 4.2-2.8 0-5-1.6-5.5-4.2zm13 0c-.5 2.6-2.7 4.2-5.5 4.2.5-2.6 2.7-4.2 5.5-4.2z" },
  leafStalk: { d: "M11 22V6h2v16zM12 7C11 4 8 2.5 4.5 2.5 4.5 6 7 8.5 12 8.2zm0 5c1-3 4-4.5 7.5-4.5 0 3.5-2.5 6-7.5 5.7zm0 5c-1-3-4-4.5-7.5-4.5 0 3.5 2.5 6 7.5 5.7z" },
  squiggle: { d: "M2 14c2-5 4-5 6 0s4 5 6 0 4-5 6 0 2 5 2 5", stroke: true },
  loops: { d: "M2 15c3-9 5-9 5 0s2 9 5 0 2-9 5 0 2 9 5 0", stroke: true },
  blob: { d: "M5 9c2-5 9-6.5 13-3.5s4.5 9.5.5 12.5-11.5 3-13.5-1.5S3 13.5 5 9z" },
  car: { d: "M3 14l2.5-5.5h12L21 14v4.5h-2.2a2.3 2.3 0 0 1-4.6 0H9.8a2.3 2.3 0 0 1-4.6 0H3zm3.2-1.5h11.6l-1.4-3H7.6z" },
  house: { d: "M12 3l9 8h-2.2v9H14v-6h-4v6H5.2v-9H3z" },
  lollipopTree: { d: "M11 22v-8h2v8zM12 2a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z" },
  zigzag: { d: "M2 17l3-6 3 6 3-6 3 6 3-6 3 6 2-4", stroke: true },
};

export const DOODLES: DoodleName[] = ["rainCloud", "tulip", "leafStalk", "squiggle", "loops", "blob", "car", "house", "lollipopTree", "zigzag"];

export type PlacedDoodle = { name: DoodleName; x: number; y: number; size: number; rotate: number; tone: Tone };

/**
 * Doodles for the empty zones of a page, decided once from the seed so the preview and the PDF agree.
 * A zone gets more shapes the larger it is; zones too small for a 22pt shape get none.
 */
export function doodlesIn(seed: string, zones: Rect[], maxPerZone = 3): PlacedDoodle[] {
  const placed: PlacedDoodle[] = [];
  zones.forEach((zone, zoneIndex) => {
    const smallest = Math.min(zone.width, zone.height);
    if (smallest < 22) return;
    const count = Math.min(maxPerZone, Math.max(1, Math.floor((zone.width * zone.height) / 16000)));
    for (let i = 0; i < count; i++) {
      const salt = `${zoneIndex}:${i}`;
      const size = Math.max(22, Math.min(44, smallest * 0.75, 22 + unit(seed, `size${salt}`) * 22));
      // Spread along the zone's longer side so shapes do not pile up.
      const along = (i + 0.2 + unit(seed, `along${salt}`) * 0.6) / count;
      const across = 0.1 + unit(seed, `across${salt}`) * 0.8;
      const horizontal = zone.width >= zone.height;
      placed.push({
        name: DOODLES[(Math.floor(unit(seed, `shape${zoneIndex}`) * DOODLES.length) + zoneIndex * 3 + i) % DOODLES.length],
        x: zone.x + (horizontal ? along : across) * (zone.width - size),
        y: zone.y + (horizontal ? across : along) * (zone.height - size),
        size,
        rotate: Math.round(unit(seed, `rot${salt}`) * 50 - 25),
        tone: TONES[(Math.floor(unit(seed, `tone${salt}`) * TONES.length) + i) % TONES.length],
      });
    }
  });
  return placed;
}

// ---- Where doodles may go on each page kind (points), computed from the same geometry the pages use. ----
import { CONTENT } from "./layout";
import { PAGE } from "./theme";

const GUTTER = 8;

/** Empty zones around an activity entry: the side gutters beside the photos, the band above the header, and the space below the text. */
export function entryZones(input: { top: number; height: number; compact: boolean; slots: Rect[]; photosTop: number; photosBottom: number; textBottom: number; bubbleTop?: number }): Rect[] {
  const zones: Rect[] = [];
  if (input.slots.length) {
    const left = Math.min(...input.slots.map((slot) => slot.x));
    const right = Math.max(...input.slots.map((slot) => slot.x + slot.width));
    const height = input.photosBottom - input.photosTop;
    zones.push({ x: GUTTER, y: input.photosTop, width: left - GUTTER * 2, height });
    zones.push({ x: right + GUTTER, y: input.photosTop, width: PAGE.width - right - GUTTER * 2, height });
  }
  const bottomEnd = input.bubbleTop !== undefined ? input.bubbleTop - 10 : input.top + input.height;
  zones.push({ x: CONTENT.x, y: input.textBottom + 10, width: CONTENT.width, height: bottomEnd - input.textBottom - 10 });
  if (!input.compact) zones.push({ x: CONTENT.x, y: 6, width: CONTENT.width, height: 24 });
  return zones.filter((zone) => zone.width >= 22 && zone.height >= 22);
}

/** Beside a centred block of `blockWidth` from `top` to `bottom`, plus the band below `below`. */
export function framingZones(blockWidth: number, top: number, bottom: number, below?: number): Rect[] {
  const left = (PAGE.width - blockWidth) / 2;
  const zones: Rect[] = [
    { x: GUTTER, y: top, width: left - GUTTER * 2, height: bottom - top },
    { x: left + blockWidth + GUTTER, y: top, width: left - GUTTER * 2, height: bottom - top },
  ];
  if (below !== undefined) zones.push({ x: CONTENT.x, y: below, width: CONTENT.width, height: PAGE.height - PAGE.margin - below });
  return zones.filter((zone) => zone.width >= 22 && zone.height >= 22);
}
