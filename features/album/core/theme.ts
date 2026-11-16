// Scrapbook palette and page geometry shared by the on-screen pages and the PDF (same hex values as globals.css).
export const colors = {
  ink: "#3A2F27",
  muted: "#6E5F53",
  inkMuted: "#8A7A6D",
  line: "#E5DED3",
  canvas: "#FBF8F3",
  surface: "#FFFFFF",
  brand: "#1FA78A",
  green: "#00735F",
  mint: "#E3F1EE",
  sun: "#F6B94A",
  sunSoft: "#FDF1D8",
  peach: "#F2A07E",
  peachSoft: "#FDE8D2",
  sky: "#A9C9D9",
  skySoft: "#EEF4F7",
  lavender: "#D9CFEA",
  lavenderSoft: "#F1ECF8",
  blue: "#2F5E78",
  orange: "#8A5300",
} as const;

export type Tone = "mint" | "sun" | "peach" | "sky" | "lavender";
export const TONES: Tone[] = ["mint", "sun", "peach", "sky", "lavender"];

/** Strong and soft colour of each tone, plus the ink that reads well on the soft one. */
export const tonePalette: Record<Tone, { strong: string; soft: string; ink: string }> = {
  mint: { strong: colors.brand, soft: colors.mint, ink: colors.green },
  sun: { strong: colors.sun, soft: colors.sunSoft, ink: colors.orange },
  peach: { strong: colors.peach, soft: colors.peachSoft, ink: "#8A3F22" },
  sky: { strong: colors.sky, soft: colors.skySoft, ink: colors.blue },
  lavender: { strong: colors.lavender, soft: colors.lavenderSoft, ink: "#5B4A80" },
};

/** A4 portrait in PDF points; the preview scales the same box. */
export const PAGE = { width: 595.28, height: 841.89, margin: 36 } as const;

export const fonts = { display: "Baloo 2", body: "Plus Jakarta Sans" } as const;
