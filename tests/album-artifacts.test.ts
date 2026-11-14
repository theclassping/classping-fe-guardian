import { describe, expect, it, vi } from "vitest";
import { fetchAlbumImages, type AlbumImages } from "classping-album/images";
import { albumFingerprint } from "@/features/album/fingerprint";
import { isStale, type Artifact } from "@/features/album/artifacts";
import { sourceForPart } from "@/features/album/worker";
import type { AlbumActivity, AlbumSource } from "classping-album/types";

function activity(id: string, date: string, photos: number, extra: Partial<AlbumActivity> = {}): AlbumActivity {
  return { id, title: `Kegiatan ${id}`, date, photos: Array.from({ length: photos }, (_, i) => ({ id: `${id}-${i}`, url: `https://media.test/${id}/${i}?sig=${Math.random()}` })), ...extra };
}
const year = { kind: "year" as const, id: "3", label: "2026/2027", start: "2026-07-01", end: "2027-06-30" };
const source = (activities: AlbumActivity[]): AlbumSource => ({
  subject: { kind: "child", id: 7, name: "Aisyah Putri", nickname: "Aisyah", initials: "AP", className: "Kelas A" },
  period: year, school: { name: "TK Ceria" }, activities, generatedAt: "2026-11-13T03:00:00Z",
});

describe("albumFingerprint", () => {
  it("ignores signed photo URLs, order and generation time, but sees edits", () => {
    const a = source([activity("a", "2026-08-01", 2, { updatedAt: "2026-08-02T00:00:00Z" }), activity("b", "2026-09-01", 1)]);
    const b = { ...source([activity("b", "2026-09-01", 1), activity("a", "2026-08-01", 2, { updatedAt: "2026-08-02T00:00:00Z" })]), generatedAt: "2027-01-01T00:00:00Z" };
    expect(albumFingerprint(a)).toBe(albumFingerprint(b));
    expect(albumFingerprint(a)).toMatch(/^[0-9a-f]{64}$/);
    const edited = source([activity("a", "2026-08-01", 2, { updatedAt: "2026-08-03T00:00:00Z" }), activity("b", "2026-09-01", 1)]);
    expect(albumFingerprint(edited)).not.toBe(albumFingerprint(a));
    const recaptioned = source([activity("a", "2026-08-01", 2, { updatedAt: "2026-08-02T00:00:00Z" }), activity("b", "2026-09-01", 1)]);
    recaptioned.activities[1].photos[0].caption = "Baru";
    expect(albumFingerprint(recaptioned)).not.toBe(albumFingerprint(a));
  });
});

describe("sourceForPart", () => {
  it("keeps only the activities inside the part's period", () => {
    const full = source([activity("a", "2026-08-01", 1), activity("b", "2026-12-31", 1), activity("c", "2027-01-01", 1)]);
    const first = sourceForPart(full, "range:2026-07-01:2026-12-31");
    expect(first?.activities.map((item) => item.id)).toEqual(["a", "b"]);
    expect(first?.period).toEqual({ kind: "range", from: "2026-07-01", to: "2026-12-31" });
    expect(sourceForPart(full, "range:2027-01-01:2027-06-30")?.activities.map((item) => item.id)).toEqual(["c"]);
    expect(sourceForPart(full, "nonsense")).toBeNull();
  });
});

describe("isStale", () => {
  const base: Artifact = { id: 1, student_id: 7, period: "year:3", fingerprint: "x", status: "building", photo_count: 10, parts: [], heartbeat_at: null, error: "", created_at: "", updated_at: new Date().toISOString() };
  it("flags a build whose heartbeat went quiet, never a finished one", () => {
    expect(isStale({ ...base, heartbeat_at: new Date().toISOString() })).toBe(false);
    expect(isStale({ ...base, heartbeat_at: new Date(Date.now() - 10 * 60_000).toISOString() })).toBe(true);
    expect(isStale({ ...base, status: "ready", heartbeat_at: new Date(Date.now() - 10 * 60_000).toISOString() })).toBe(false);
    expect(isStale({ ...base, status: "pending", heartbeat_at: null, updated_at: new Date(Date.now() - 10 * 60_000).toISOString() })).toBe(true);
  });
});

describe("fetchAlbumImages cache", () => {
  it("serves cached photos without fetching them again", async () => {
    const cache: AlbumImages = new Map([["https://media.test/cached", Buffer.from("jpeg")]]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    try {
      const images = await fetchAlbumImages(["https://media.test/cached", "https://media.test/missing"], { cache });
      expect(images.get("https://media.test/cached")?.toString()).toBe("jpeg");
      expect(images.has("https://media.test/missing")).toBe(false);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toBe("https://media.test/missing");
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
