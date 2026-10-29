import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PaymentReceipt } from "@/lib/receipt";

const green = rgb(0.09, 0.47, 0.37);
const ink = rgb(0.07, 0.1, 0.09);
const muted = rgb(0.42, 0.47, 0.45);
const line = rgb(0.86, 0.9, 0.88);
const tint = rgb(0.93, 0.97, 0.95);

/** Keeps text inside the WinAnsi range that pdf-lib's standard fonts can draw. */
export function pdfSafeText(value: string) {
  return value
    .replace(/ /g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e¡-ÿ]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export type ReceiptPdfOptions = { guardianName?: string; issuedAt?: Date };

// The literal path keeps the file in the deployment bundle (Next.js traces it).
const logoFile = path.join(process.cwd(), "assets", "classping-logo.png");
let logoBytes: Promise<Uint8Array | null> | undefined;

/** The ClassPing wordmark, read once per process; `null` when the asset is missing. */
function loadLogo() {
  logoBytes ??= readFile(logoFile).then((bytes) => new Uint8Array(bytes)).catch(() => null);
  return logoBytes;
}

export async function buildReceiptPdf(receipt: PaymentReceipt, options: ReceiptPdfOptions = {}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bukti verifikasi pembayaran ${pdfSafeText(receipt.reference)}`);
  doc.setProducer("ClassPing Guardian Portal");
  const page = doc.addPage([595.28, 841.89]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 56;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const draw = (text: string, x: number, size: number, font: PDFFont, color = ink) => {
    page.drawText(pdfSafeText(text), { x, y, size, font, color });
  };

  const logo = await loadLogo();
  if (logo) {
    const image = await doc.embedPng(logo);
    const logoHeight = 40;
    const { width: logoWidth } = image.scale(logoHeight / image.height);
    page.drawImage(image, { x: margin - 7, y: y - 16, width: logoWidth, height: logoHeight });
  } else {
    draw("classping", margin, 22, bold, green);
  }
  y -= 44;
  draw("PEMBAYARAN BERHASIL", margin, 9, bold, green);
  y -= 26;
  draw("Pembayaran telah diverifikasi", margin, 22, bold);
  y -= 30;
  draw(`Halo ${options.guardianName?.trim() || "Bapak/Ibu Wali"},`, margin, 11, bold);
  y -= 20;
  for (const text of wrap(`Pembayaran untuk tagihan ${receipt.feeType} ${receipt.period} atas nama ${receipt.student} telah berhasil diverifikasi oleh pihak sekolah.`, regular, 11, width)) {
    draw(text, margin, 11, regular, muted);
    y -= 16;
  }

  // Box padding: 16pt above the title's cap height and below the subtitle's descender.
  y -= 24;
  drawBox(page, margin, y - 36, width, 60, tint);
  draw("Pembayaran berhasil", margin + 16, 12, bold, green);
  y -= 18;
  draw("Pembayaran telah diterima dan dicatat sebagai pembayaran yang telah selesai.", margin + 16, 10, regular, muted);
  y -= 38; // 20pt between the box and the table

  const rows: Array<[string, string, boolean]> = [
    ["Nomor tagihan", receipt.reference, false],
    ["Siswa", receipt.student, false],
    ["Kelas", receipt.className, false],
    ["Jenis tagihan", receipt.feeType, false],
    ["Periode", receipt.period, false],
    ["Metode pembayaran", receipt.method, false],
    ["Dibayarkan pada", receipt.paidAt, false],
    ["Diverifikasi pada", receipt.verifiedAt, false],
    ["Total pembayaran", receipt.amount, true],
  ];
  const rowHeight = 26;
  const tableTop = y;
  drawBox(page, margin, tableTop - rows.length * rowHeight - 14, width, rows.length * rowHeight + 14, rgb(0.98, 0.99, 0.985));
  for (const [label, value, highlight] of rows) {
    y -= rowHeight;
    draw(label, margin + 16, 10, regular, muted);
    const font = bold;
    const size = highlight ? 14 : 10.5;
    const text = pdfSafeText(value);
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: margin + width - 16 - textWidth, y, size, font, color: highlight ? green : ink });
    if (!highlight) page.drawLine({ start: { x: margin + 16, y: y - 8 }, end: { x: margin + width - 16, y: y - 8 }, thickness: 0.5, color: line });
  }

  y -= 62; // 20pt between the table and the closing box
  const note = wrap("Tidak ada tindakan lebih lanjut yang diperlukan untuk pembayaran ini. Simpan dokumen ini sebagai bukti konfirmasi pembayaran.", regular, 10, width - 32);
  drawBox(page, margin, y - 18 - note.length * 14 - 2, width, 18 + note.length * 14 + 30, tint);
  draw("Pembayaran selesai", margin + 16, 11, bold, green);
  y -= 18;
  for (const text of note) {
    draw(text, margin + 16, 10, regular, muted);
    y -= 14;
  }

  const issued = options.issuedAt ?? new Date();
  const issuedText = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(issued);
  page.drawText(pdfSafeText(`Diterbitkan otomatis oleh ClassPing pada ${issuedText} WIB.`), { x: margin, y: margin - 10, size: 8, font: regular, color: muted });

  return doc.save();
}

function drawBox(page: PDFPage, x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y, width, height, color, borderColor: line, borderWidth: 0.5 });
}
