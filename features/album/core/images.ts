// Fetches the album's photos through their signed URLs and shrinks them for the PDF. Server-side only.
import sharp from "sharp";

export type AlbumImages = Map<string, Buffer>;

const MAX_EDGE = 1000;
const CONCURRENCY = 4;

async function fetchOne(url: string, signal: AbortSignal): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "follow", signal });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    return await sharp(bytes).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  } catch {
    return null;
  }
}

/**
 * JPEG bytes by URL; a photo that cannot be read is simply absent, and the page shows a placeholder for it.
 * Pass the same `cache` for every part of a multi-part album so each photo is fetched and shrunk once.
 */
export async function fetchAlbumImages(urls: string[], { timeoutMs = 45_000, cache }: { timeoutMs?: number; cache?: AlbumImages } = {}): Promise<AlbumImages> {
  const images: AlbumImages = new Map();
  const unique = [...new Set(urls)].filter((url) => {
    const cached = cache?.get(url);
    if (cached) images.set(url, cached);
    return !cached;
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let next = 0;
  async function worker() {
    while (next < unique.length) {
      const url = unique[next++];
      const bytes = await fetchOne(url, controller.signal);
      if (!bytes) continue;
      images.set(url, bytes);
      cache?.set(url, bytes);
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
  } finally {
    clearTimeout(timer);
  }
  return images;
}
