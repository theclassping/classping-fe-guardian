// Little scrapbook shapes drawn by both renderers from the same paths (viewBox 0 0 24 24).
export type StickerName = "star" | "heart" | "sun" | "cloud" | "flower" | "sparkle";

export const STICKER_PATHS: Record<StickerName, string> = {
  star: "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z",
  heart: "M12 21s-7.5-4.6-9.3-9.2C1.3 8.1 3.6 4.8 7 4.8c2 0 3.4 1.1 5 2.8 1.6-1.7 3-2.8 5-2.8 3.4 0 5.7 3.3 4.3 7C19.5 16.4 12 21 12 21z",
  sun: "M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM11 1h2v3h-2zm0 19h2v3h-2zM1 11h3v2H1zm19 0h3v2h-3zM4.2 3.5l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 15.7l1.4-1.4 2.1 2.1-1.4 1.4zM3.5 19.8l2.1-2.1 1.4 1.4-2.1 2.1zM19.8 4.2l-2.1 2.1-1.4-1.4 2.1-2.1z",
  cloud: "M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8.6 3.7 3.7 0 0 1 18 18H7z",
  flower: "M12 2a3 3 0 0 1 3 3c0 .6-.2 1.2-.5 1.7A3 3 0 1 1 17.5 12a3 3 0 1 1-3 5.3A3 3 0 1 1 9.5 17.3 3 3 0 1 1 6.5 12a3 3 0 1 1 3-5.3C9.2 6.2 9 5.6 9 5a3 3 0 0 1 3-3zm0 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  sparkle: "M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z",
};

export const STICKERS: StickerName[] = ["star", "heart", "sun", "cloud", "flower", "sparkle"];

/** Deterministic confetti for a cover or divider: positions in points relative to the page, radius and tone index. */
export function confettiFor(seed: string, count: number, width: number, height: number, unit: (seed: string, salt: string) => number) {
  return Array.from({ length: count }, (_, i) => ({
    x: unit(seed, `cx${i}`) * width,
    y: unit(seed, `cy${i}`) * height,
    size: 4 + unit(seed, `cs${i}`) * 8,
    rotate: unit(seed, `cr${i}`) * 360,
    shape: i % 3 === 0 ? "circle" : "bar",
    toneIndex: Math.floor(unit(seed, `ct${i}`) * 5),
  }));
}
