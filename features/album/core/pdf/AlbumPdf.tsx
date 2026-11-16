// The album for print: the same pages as components/pages.tsx, drawn with react-pdf primitives at the same coordinates.
import { Document, Image, Page, Path, Svg, Text, View, type Styles } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { AlbumImages } from "../images";
import { ACTIVITY_PAGE, CONTENT, POLAROID, halfBands, photoSlots, slotsHeight, type Rect } from "../layout";
import { unit } from "../seed";
import { STICKERS, STICKER_PATHS, confettiFor, type StickerName } from "../stickers";
import { DOODLE_PATHS, doodlesIn, entryZones, framingZones, type PlacedDoodle } from "../doodles";
import { PAGE, TONES, colors, fonts, tonePalette, type Tone } from "../theme";
import type { ActivityEntry, AlbumDocument, AlbumPage, AlbumSubject, MonthCalendar, PlacedPhoto } from "../types";
import { initialsOf } from "../format";

type Style = Styles[string];
const WEEKDAYS = ["S", "S", "R", "K", "J", "S", "M"];
const display = (weight: 700 | 800 = 800): Style => ({ fontFamily: fonts.display, fontWeight: weight });
const body = (weight: 400 | 600 | 700 | 800 = 400): Style => ({ fontFamily: fonts.body, fontWeight: weight });

function box(rect: Rect, extra: Style = {}): Style {
  return { position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height, ...extra };
}

function Sticker({ name, size, tone, style = {} }: { name: StickerName; size: number; tone: Tone; style?: Style }) {
  return (
    <View style={{ position: "absolute", width: size, height: size, ...style }}>
      <Svg viewBox="0 0 24 24" width={size} height={size}><Path d={STICKER_PATHS[name]} fill={tonePalette[tone].strong} /></Svg>
    </View>
  );
}

function Doodles({ items }: { items: PlacedDoodle[] }) {
  return (
    <>
      {items.map((doodle, index) => {
        const { d, stroke } = DOODLE_PATHS[doodle.name];
        const color = tonePalette[doodle.tone].strong;
        return (
          <View key={index} style={{ position: "absolute", left: doodle.x, top: doodle.y, width: doodle.size, height: doodle.size, transform: `rotate(${doodle.rotate}deg)` }}>
            <Svg viewBox="0 0 24 24" width={doodle.size} height={doodle.size}>
              {stroke ? <Path d={d} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /> : <Path d={d} fill={color} />}
            </Svg>
          </View>
        );
      })}
    </>
  );
}

function Confetti({ seed, count = 36, muted = false }: { seed: string; count?: number; muted?: boolean }) {
  return (
    <>
      {confettiFor(seed, count, PAGE.width, PAGE.height, unit).map((piece, index) => (
        <View key={index} style={{ position: "absolute", left: piece.x, top: piece.y, width: piece.size, height: piece.shape === "circle" ? piece.size : piece.size / 2.5, borderRadius: piece.shape === "circle" ? piece.size : 2, transform: `rotate(${piece.rotate}deg)`, backgroundColor: tonePalette[TONES[piece.toneIndex]].strong, opacity: muted ? 0.35 : 0.8 }} />
      ))}
    </>
  );
}

function Polaroid({ photo, rect, images }: { photo: PlacedPhoto; rect: Rect; images: AlbumImages }) {
  const photoWidth = rect.width - POLAROID.side * 2;
  const photoHeight = photoWidth * POLAROID.ratio;
  const bytes = images.get(photo.url);
  return (
    <View style={box(rect, { backgroundColor: "#fff", borderRadius: 3, borderWidth: 0.75, borderColor: colors.line, transform: `rotate(${photo.tilt}deg)` })}>
      <View style={{ position: "absolute", left: POLAROID.side, top: POLAROID.top, width: photoWidth, height: photoHeight, backgroundColor: "#F3EEE6", borderRadius: 2, overflow: "hidden" }}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image draws into the PDF; it has no alt prop. */}
        {bytes ? <Image src={{ data: bytes, format: "jpg" }} style={{ width: photoWidth, height: photoHeight, objectFit: "cover" }} /> : <Text style={{ ...body(600), fontSize: 8, color: colors.inkMuted, textAlign: "center", marginTop: photoHeight / 2 - 5 }}>Foto tidak tersedia</Text>}
      </View>
      {photo.caption && <Text style={{ position: "absolute", left: 12, right: 12, top: POLAROID.top + photoHeight + 6, ...display(700), fontSize: 9, lineHeight: 1.3, textAlign: "center", color: colors.muted, maxLines: 2, textOverflow: "ellipsis" }}>{photo.caption}</Text>}
      <View style={{ position: "absolute", left: rect.width / 2 - 35, top: -8, width: 70, height: 18, borderRadius: 2, opacity: 0.75, backgroundColor: tonePalette[photo.tape].strong, transform: "rotate(-3deg)" }} />
    </View>
  );
}

function Pill({ label, tone, outline = false, style = {} }: { label: string; tone?: Tone; outline?: boolean; style?: Style }) {
  const palette = tone ? tonePalette[tone] : undefined;
  return (
    <Text style={{ ...body(800), fontSize: 9, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: outline ? "#fff" : palette?.soft, color: outline ? colors.muted : palette?.ink, ...(outline ? { borderWidth: 1, borderColor: colors.line } : {}), ...style }}>{label}</Text>
  );
}

function SpeechBubble({ teacher, text, tone, rect }: { teacher?: string; text: string; tone: Tone; rect: Rect }) {
  const palette = tonePalette[tone];
  return (
    <View style={box(rect, { borderWidth: 2, borderColor: palette.strong, borderRadius: 18, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.soft, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Text style={{ ...display(800), fontSize: 14, color: palette.ink }}>{initialsOf(teacher || "Guru") || "G"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...body(800), fontSize: 8, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkMuted, marginBottom: 3 }}>Catatan {teacher ? `dari ${teacher}` : "guru"}</Text>
        <Text style={{ ...body(400), fontSize: 10.5, lineHeight: 1.45, color: colors.ink, maxLines: 3, textOverflow: "ellipsis" }}>{text}</Text>
      </View>
      <View style={{ position: "absolute", left: 56, bottom: -12, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: palette.strong }} />
    </View>
  );
}

function Entry({ entry, top, height, compact, images }: { entry: ActivityEntry; top: number; height: number; compact: boolean; images: AlbumImages }) {
  const headerHeight = compact ? 60 : ACTIVITY_PAGE.headerHeight;
  let photosTop = top + headerHeight + (compact ? 6 : 14);
  // A continuation page with few photos would leave most of the page blank: centre them instead.
  if (entry.continuation && entry.photos.length <= 3) photosTop = top + headerHeight + Math.max(14, (height - headerHeight - slotsHeight(photoSlots(entry.layout, 0, entry.photos.length, compact))) / 2);
  const slots = photoSlots(entry.layout, photosTop, entry.photos.length, compact);
  const photosBottom = slots.length ? photosTop + slotsHeight(slots) : photosTop;
  const bubbleTop = top + height - ACTIVITY_PAGE.bubbleHeight;
  const noteBottom = entry.remark && !compact ? bubbleTop - 14 : top + height;
  const noteTop = photosBottom + 18;
  const palette = tonePalette[entry.tone];
  const descriptionHeight = entry.description && noteBottom - noteTop >= 36 ? Math.min(noteBottom - noteTop, 96) : 0;
  const textBottom = descriptionHeight ? noteTop + descriptionHeight : entry.layout === "none" ? photosTop + 130 : photosBottom;
  const doodles = doodlesIn(`entry:${entry.activityId}:${entry.continuation ? 1 : 0}`, entryZones({ top, height, compact, slots, photosTop, photosBottom, textBottom, bubbleTop: entry.remark && !compact ? bubbleTop : undefined }));
  return (
    <>
      <Doodles items={doodles} />
      <View style={box({ x: CONTENT.x, y: top, width: CONTENT.width, height: headerHeight })}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Pill label={entry.dateLabel} tone={entry.tone} />
          {entry.continuation && <Pill label="lanjutan" outline style={{ marginLeft: 8 }} />}
          {entry.teacher && !compact && <Text style={{ ...body(600), fontSize: 9, color: colors.muted, marginLeft: 8 }}>bersama {entry.teacher}</Text>}
        </View>
        <Text style={{ ...display(800), fontSize: compact ? 18 : 24, lineHeight: 1.1, letterSpacing: -0.3, color: colors.ink, maxLines: compact ? 1 : 2, textOverflow: "ellipsis" }}>{entry.title}</Text>
      </View>
      {entry.layout === "none" && !entry.continuation && (
        <View style={box({ x: CONTENT.x + 120, y: photosTop + 10, width: CONTENT.width - 240, height: 120 }, { backgroundColor: palette.soft, borderRadius: 18, alignItems: "center", justifyContent: "center" })}>
          <Svg viewBox="0 0 24 24" width={34} height={34}><Path d={STICKER_PATHS.sparkle} fill={palette.strong} /></Svg>
          <Text style={{ ...body(700), fontSize: 10, color: palette.ink, marginTop: 8 }}>Belum ada foto untuk kegiatan ini</Text>
        </View>
      )}
      {entry.photos.map((photo, index) => <Polaroid key={photo.id} photo={photo} rect={slots[index]} images={images} />)}
      {entry.description && noteBottom - noteTop >= 36 && (
        <Text style={box({ x: CONTENT.x, y: noteTop, width: CONTENT.width, height: Math.min(noteBottom - noteTop, 96) }, { ...body(400), fontSize: 10, lineHeight: 1.5, color: colors.muted, maxLines: 5, textOverflow: "ellipsis" })}>{entry.description}</Text>
      )}
      {entry.remark && !compact && <SpeechBubble teacher={entry.teacher} text={entry.remark} tone={entry.tone} rect={{ x: CONTENT.x, y: bubbleTop, width: CONTENT.width, height: ACTIVITY_PAGE.bubbleHeight }} />}
    </>
  );
}

function MiniCalendar({ calendar, rect, tone, dense }: { calendar: MonthCalendar; rect: Rect; tone: Tone; dense: boolean }) {
  const cell = rect.width / 7;
  const rowHeight = dense ? 13 : 36;
  const headHeight = dense ? 11 : 18;
  const active = new Set(calendar.activeDays);
  const dot = dense ? 12 : 28;
  return (
    <View style={box(rect, { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: "#fff", paddingTop: 10 })}>
      <Text style={{ ...display(800), fontSize: dense ? 11 : 14, color: colors.ink, marginLeft: dense ? 10 : 14, marginBottom: dense ? 4 : 8 }}>{dense ? calendar.label.split(" ")[0] : calendar.label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: cell * 7 }}>
        {WEEKDAYS.map((day, index) => <Text key={index} style={{ width: cell, height: headHeight, textAlign: "center", ...body(800), fontSize: dense ? 6 : 8, color: colors.inkMuted }}>{day}</Text>)}
        {calendar.weeks.flat().map((day, index) => {
          const isActive = day != null && active.has(day);
          return (
            <View key={index} style={{ width: cell, height: rowHeight, alignItems: "center", justifyContent: "center" }}>
              <View style={isActive ? { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: tonePalette[tone].strong, alignItems: "center", justifyContent: "center" } : {}}>
                <Text style={{ ...body(isActive ? 800 : 400), fontSize: dense ? 7 : 11, color: isActive ? "#fff" : colors.muted }}>{day ?? ""}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatTile({ value, label, tone, sticker, rect }: { value: number; label: string; tone: Tone; sticker: StickerName; rect: Rect }) {
  const palette = tonePalette[tone];
  return (
    <View style={box(rect, { backgroundColor: palette.soft, borderRadius: 18, alignItems: "center", justifyContent: "center" })}>
      <Svg viewBox="0 0 24 24" width={26} height={26}><Path d={STICKER_PATHS[sticker]} fill={palette.strong} /></Svg>
      <Text style={{ ...display(800), fontSize: 24, color: palette.ink, marginTop: 2 }}>{value}</Text>
      <Text style={{ ...body(800), fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: palette.ink }}>{label}</Text>
    </View>
  );
}

function Wordmark() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Svg viewBox="0 0 110 110" width={18} height={18}><Path d="M8 44C8 20 24 8 55 8s47 12 47 36-16 36-47 36c-8 0-15-1-21-3L18 96l4-22C12 66 8 56 8 44Z" fill={colors.brand} /><Path d="M38 48q17 16 34 0" fill="none" stroke={colors.canvas} strokeWidth={7} strokeLinecap="round" /></Svg>
      <Text style={{ ...display(800), fontSize: 13, color: colors.green, marginLeft: 5 }}>classping</Text>
    </View>
  );
}

function Avatar({ subject, size }: { subject: AlbumSubject; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#fff", borderWidth: 6, borderColor: colors.mint, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...display(800), fontSize: size * 0.36, color: colors.green }}>{subject.initials}</Text>
    </View>
  );
}

function A4({ children, background }: { children: ReactNode; background: string }) {
  // wrap={false} keeps each album page on one sheet, but a page holding only absolute children then collapses to
  // zero height (MediaBox height 0); the relative full-size box below keeps the sheet at A4.
  return (
    <Page size="A4" wrap={false} style={{ backgroundColor: background, fontFamily: fonts.body, fontSize: 10, color: colors.ink }}>
      <View style={{ position: "relative", width: PAGE.width, height: PAGE.height }}>{children}</View>
    </Page>
  );
}

const centered = (top: number, extra: Style = {}): Style => ({ position: "absolute", left: CONTENT.x, top, width: CONTENT.width, textAlign: "center", ...extra });

function AlbumPdfPage({ page, images }: { page: AlbumPage; images: AlbumImages }) {
  switch (page.kind) {
    case "cover": {
      const palette = tonePalette[page.tone];
      return (
        <A4 background={palette.soft}>
          <Confetti seed={`cover:${page.title}`} />
          {STICKERS.map((name, i) => <Sticker key={name} name={name} size={30 + (i % 3) * 8} tone={TONES[(i + 1) % TONES.length]} style={{ left: 40 + unit(page.title, `sx${i}`) * 500, top: 40 + unit(page.title, `sy${i}`) * 220, transform: `rotate(${unit(page.title, `sr${i}`) * 40 - 20}deg)` }} />)}
          <View style={{ position: "absolute", left: PAGE.width / 2 - 95, top: 190, width: 190, height: 190, borderRadius: 95, borderWidth: 14, borderStyle: "dotted", borderColor: palette.strong, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Avatar subject={page.subject} size={150} />
          </View>
          <Text style={centered(410, { ...body(800), fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: palette.ink })}>Album digital</Text>
          <Text style={centered(428, { ...display(800), fontSize: 36, lineHeight: 1.1, color: colors.ink })}>{page.title}</Text>
          <View style={{ position: "absolute", left: 0, right: 0, top: 540, alignItems: "center" }}>
            <Text style={{ ...display(800), fontSize: 14, paddingVertical: 7, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#fff", color: palette.ink }}>{page.periodLabel}</Text>
          </View>
          <Text style={centered(586, { ...body(700), fontSize: 12, color: colors.muted })}>{page.subject.className}</Text>
          <View style={{ position: "absolute", left: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ ...display(800), fontSize: 14, color: colors.ink }}>{page.school.name}</Text>
              {page.school.branchName && <Text style={{ ...body(400), fontSize: 9, color: colors.muted }}>{page.school.branchName}</Text>}
            </View>
            <Wordmark />
          </View>
        </A4>
      );
    }
    case "summary": {
      const tiles: [number, string, Tone, StickerName][] = [[page.stats.activities, "kegiatan", "mint", "star"], [page.stats.photos, "foto", "sun", "sun"], [page.stats.days, "hari seru", "peach", "heart"]];
      const dense = page.months.length > 1;
      const calendarTop = 220;
      const columns = dense ? 3 : 1;
      const cellWidth = dense ? 160 : 420;
      const gap = dense ? 21 : 0;
      const rowHeight = dense ? 118 : 330;
      const rows = Math.ceil(page.months.length / columns);
      const pillsTop = calendarTop + rows * rowHeight + (dense ? 10 : 20);
      return (
        <A4 background="#fff">
          <Text style={{ position: "absolute", left: CONTENT.x, top: 40, ...body(800), fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: colors.green }}>Sekilas</Text>
          <Text style={{ position: "absolute", left: CONTENT.x, top: 56, ...display(800), fontSize: 28, color: colors.ink }}>{page.periodLabel}</Text>
          {tiles.map(([value, label, tone, sticker], i) => <StatTile key={label} value={value} label={label} tone={tone} sticker={sticker} rect={{ x: CONTENT.x + i * 177, width: 169, y: 112, height: 86 }} />)}
          <Doodles items={doodlesIn(`summary:${page.periodLabel}`, dense ? framingZones(CONTENT.width + 40, calendarTop, calendarTop, pillsTop + 90) : framingZones(cellWidth, calendarTop, calendarTop + 300, pillsTop + 90))} />
          {page.months.map((calendar, i) => (
            <MiniCalendar key={calendar.label} calendar={calendar} tone={TONES[i % TONES.length]} dense={dense} rect={{ x: dense ? CONTENT.x + (i % columns) * (cellWidth + gap) : CONTENT.x + (CONTENT.width - cellWidth) / 2, y: calendarTop + Math.floor(i / columns) * rowHeight, width: cellWidth, height: rowHeight - 10 }} />
          ))}
          {page.topActivities.length > 0 && (
            <View style={box({ x: CONTENT.x, y: pillsTop, width: CONTENT.width, height: 80 })}>
              <Text style={{ ...body(800), fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.inkMuted, marginBottom: 8 }}>Paling sering</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {page.topActivities.map((item, i) => <Pill key={item.title} label={`${item.title} ×${item.count}`} tone={TONES[(i + 2) % TONES.length]} style={{ fontSize: 11, paddingVertical: 7, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 }} />)}
              </View>
            </View>
          )}
          {page.stats.activities === 0 && <Text style={box({ x: CONTENT.x, y: pillsTop, width: CONTENT.width, height: 60 }, { ...body(400), fontSize: 11, color: colors.muted, textAlign: "center", paddingTop: 22, borderWidth: 1, borderStyle: "dashed", borderColor: colors.line, borderRadius: 14 })}>Belum ada kegiatan yang dibagikan pada periode ini.</Text>}
        </A4>
      );
    }
    case "monthDivider": {
      const palette = tonePalette[page.tone];
      const heroRect = { x: (PAGE.width - 340) / 2, y: 330, width: 340, height: 10 + 320 * 0.75 + 40 };
      return (
        <A4 background={palette.soft}>
          <Confetti seed={`divider:${page.label}`} count={24} muted />
          <Doodles items={doodlesIn(`divider:${page.label}`, [...framingZones(340, 330, 640), { x: CONTENT.x, y: 44, width: CONTENT.width, height: 90 }])} />
          <Text style={centered(150, { ...body(800), fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: palette.ink })}>Bulan</Text>
          <Text style={centered(168, { ...display(800), fontSize: 40, color: colors.ink })}>{page.label}</Text>
          <Text style={centered(240, { ...body(700), fontSize: 12, color: palette.ink })}>{page.activityCount} kegiatan · {page.photoCount} foto</Text>
          {page.heroPhoto && <Polaroid photo={page.heroPhoto} rect={heroRect} images={images} />}
        </A4>
      );
    }
    case "activity": {
      if (page.entries.length === 2) {
        const bands = halfBands();
        return (
          <A4 background="#fff">
            {page.entries.map((entry, i) => <Entry key={`${entry.activityId}-${i}`} entry={entry} top={bands[i].top} height={bands[i].height} compact images={images} />)}
            <View style={{ position: "absolute", left: PAGE.margin, right: PAGE.margin, top: bands[1].top - 8, borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.line }} />
          </A4>
        );
      }
      return (
        <A4 background="#fff">
          <Entry entry={page.entries[0]} top={ACTIVITY_PAGE.headerTop} height={PAGE.height - PAGE.margin * 2} compact={false} images={images} />
        </A4>
      );
    }
    case "backCover":
      return (
        <A4 background={colors.canvas}>
          <Confetti seed={`back:${page.subjectName}`} count={20} muted />
          <Sticker name="heart" size={64} tone="peach" style={{ left: (PAGE.width - 64) / 2, top: 300 }} />
          <Text style={centered(380, { ...display(800), fontSize: 28, lineHeight: 1.1, color: colors.ink })}>Sampai jumpa di petualangan berikutnya, {page.subjectName}!</Text>
          <Text style={centered(470, { ...body(400), fontSize: 12, color: colors.muted })}>Dibuat dengan sayang oleh {page.school.name}{page.school.branchName ? ` · ${page.school.branchName}` : ""}</Text>
          <Text style={centered(496, { ...body(400), fontSize: 9, color: colors.inkMuted })}>Album dibuat pada {page.generatedLabel}</Text>
          <View style={{ position: "absolute", left: 0, right: 0, bottom: PAGE.margin, alignItems: "center" }}><Wordmark /></View>
        </A4>
      );
  }
}

export default function AlbumPdf({ document, images, producer = "ClassPing" }: { document: AlbumDocument; images: AlbumImages; producer?: string }) {
  return (
    <Document title={document.title} author="ClassPing" producer={producer} language="id">
      {document.pages.map((page, index) => <AlbumPdfPage key={index} page={page} images={images} />)}
    </Document>
  );
}
