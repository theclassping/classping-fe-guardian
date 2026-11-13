import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { buildAlbum } from "classping-album/model";
import { renderAlbumPdf } from "classping-album/pdf/render";
import type { AlbumActivity, AlbumSource } from "classping-album/types";

async function jpeg(color: { r: number; g: number; b: number }) {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: color } }).jpeg().toBuffer();
}

function activity(id: string, date: string, photos: number, extra: Partial<AlbumActivity> = {}): AlbumActivity {
  return { id, title: `Kegiatan ${id}`, date, photos: Array.from({ length: photos }, (_, i) => ({ id: `${id}-${i}`, url: `mem://${id}/${i}`, caption: i % 2 ? `Foto ${i + 1} yang seru sekali` : undefined })), ...extra };
}

const source: AlbumSource = {
  subject: { kind: "child", id: 7, name: "Aisyah Putri", nickname: "Aisyah", initials: "AP", className: "Kelas A · Cabang Utama" },
  period: { kind: "month", year: 2026, month: 10 },
  school: { name: "TK Ceria", branchName: "Cabang Utama" },
  generatedAt: "2026-11-13T03:00:00Z",
  activities: [
    activity("senam", "2026-10-02", 1, { title: "Senam Pagi Bersama", teacher: "Bu Anna", remark: "Aisyah semangat sekali mengikuti gerakan senam dari awal sampai akhir.", description: "Pagi ini kita senam bersama di halaman sekolah." }),
    activity("lukis", "2026-10-06", 4, { title: "Melukis dengan Jari", teacher: "Bu Anna", remark: "Hasil lukisannya penuh warna!" }),
    activity("kebun", "2026-10-09", 9, { title: "Berkebun di Taman Sekolah", teacher: "Pak Budi", description: "Menanam kacang hijau dan menyiramnya setiap hari." }),
    activity("cerita", "2026-10-13", 1, { title: "Mendengar Dongeng", teacher: "Bu Anna" }),
    activity("balok", "2026-10-14", 2, { title: "Bermain Balok", teacher: "Bu Anna" }),
    activity("kosong", "2026-10-20", 0, { title: "Kunjungan Pemadam Kebakaran", remark: "Berani bertanya pada petugas." }),
  ],
};

describe("album PDF", () => {
  it("renders every page with embedded fonts and photos", async () => {
    const album = buildAlbum(source);
    const images = new Map<string, Buffer>();
    const palette = [{ r: 246, g: 185, b: 74 }, { r: 31, g: 167, b: 138 }, { r: 242, g: 160, b: 126 }, { r: 169, g: 201, b: 217 }];
    await Promise.all(album.photoUrls.map(async (url, i) => { if (!url.endsWith("/2")) images.set(url, await jpeg(palette[i % palette.length])); }));
    const bytes = await renderAlbumPdf(album, images);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(album.pages.length);
    expect(album.pages.map((p) => p.kind)).toEqual(["cover", "summary", "activity", "activity", "activity", "activity", "activity", "activity", "backCover"]);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toMatch(/Baloo2|Baloo 2/);
    expect(text).not.toContain("MediaBox [0 0 595.280029 0]");
    expect(text).toContain("MediaBox [0 0 595.280029 841.890015]");
    const out = process.env.ALBUM_PDF_OUT;
    if (out) { await mkdir(out, { recursive: true }); await writeFile(`${out}/${album.fileName}`, bytes); }
  }, 60_000);
});
