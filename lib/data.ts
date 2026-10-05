export type ChildId = "alya" | "jisindo";

export type ChildProfile = {
  id: ChildId;
  name: string;
  firstName: string;
  nickname?: string;
  initials: string;
  className: string;
  classCode: string;
  nis: string;
  school: string;
  academicYear: string;
  badge: string;
};

export type Activity = {
  childId: ChildId;
  slug: string;
  title: string;
  date: string;
  time: string;
  emoji: string;
  secondaryEmoji: string;
  tone: "peach" | "mint" | "lavender" | "blue";
  photos: number;
  summary: string;
  description: string;
  teacher: string;
  teacherNote: string;
  skills: string[];
  imageUrls?: string[];
};

export type Assessment = {
  childId: ChildId;
  slug: string;
  title: string;
  period: string;
  status: string;
  summary: string;
  note: string;
  teacher: string;
  scores: { label: string; level: string; value: number }[];
};

export type Invoice = {
  childId: ChildId;
  slug: string;
  month: string;
  amount: string;
  billAmount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
  statusTone: "warning" | "success" | "late" | "partial";
  method: string;
  paidAt: string;
  fine: string;
  paymentSubmitted?: boolean;
  verifiedAt?: string;
  proofUrl?: string;
};

export const children: Record<ChildId, ChildProfile> = {
  alya: { id: "alya", name: "Siswa", firstName: "Siswa", initials: "S", className: "A1 · Matahari", classCode: "A1", nis: "26001", school: "TK Harapan Bangsa", academicYear: "2026/2027", badge: "1" },
  jisindo: { id: "jisindo", name: "Jisindo Beaugeste", firstName: "Jisindo", initials: "JB", className: "B2 · Bulan", classCode: "B2", nis: "26008", school: "TK Harapan Bangsa", academicYear: "2026/2027", badge: "2" },
};

export const unselectedChild: ChildProfile = {
  ...children.alya,
  name: "Siswa",
  firstName: "Siswa",
  initials: "S",
};

export function getChild(value?: string | null) {
  if (value === "alya") return children.alya;
  if (value === "jisindo") return children.jisindo;
  return unselectedChild;
}

export const activities: Activity[] = [
  { childId: "alya", slug: "melukis-dengan-jari", title: "Melukis dengan Jari", date: "3 September 2026", time: "09.00", emoji: "🎨", secondaryEmoji: "🖐️", tone: "peach", photos: 2, summary: "Anak belajar mengenal warna primer dan menciptakan warna baru.", description: "Anak terlihat antusias mencampur warna biru dan kuning. Ia mampu menyebutkan warna baru yang terbentuk dan berbagi alat dengan teman.", teacher: "Bu Ratna", teacherNote: "Anak sudah berani bereksperimen dan menunggu giliran saat menggunakan cat.", skills: ["Kreativitas", "Motorik halus", "Sosial"] },
  { childId: "alya", slug: "menanam-kacang-hijau", title: "Menanam Kacang Hijau", date: "3 September 2026", time: "10.15", emoji: "🌱", secondaryEmoji: "🪴", tone: "mint", photos: 2, summary: "Belajar merawat tanaman dan mengamati pertumbuhan biji.", description: "Anak belajar memasukkan kapas dan biji ke dalam gelas kecil, lalu menyiramnya secukupnya. Ia dapat mengurutkan langkah kegiatan dengan baik.", teacher: "Bu Sinta", teacherNote: "Anak sangat teliti dan berinisiatif membantu merapikan meja setelah kegiatan.", skills: ["Sains awal", "Kemandirian", "Tanggung jawab"] },
  { childId: "alya", slug: "bermain-alat-musik", title: "Bermain Alat Musik", date: "31 Agustus 2026", time: "11.00", emoji: "🎵", secondaryEmoji: "🥁", tone: "lavender", photos: 3, summary: "Mengenal ritme sederhana menggunakan tamborin dan marakas.", description: "Anak mengikuti pola ketukan sederhana dan dapat membedakan bunyi keras serta pelan bersama teman-temannya.", teacher: "Bu Nia", teacherNote: "Anak mengikuti instruksi dengan baik dan semakin percaya diri tampil di depan kelas.", skills: ["Seni", "Konsentrasi", "Percaya diri"] },
  { childId: "jisindo", slug: "eksperimen-cahaya", title: "Eksperimen Cahaya dan Bayangan", date: "3 September 2026", time: "08.30", emoji: "🔦", secondaryEmoji: "🌒", tone: "blue", photos: 2, summary: "Anak mencoba berbagai benda untuk melihat bentuk bayangan.", description: "Anak mencoba senter pada benda bening dan tidak bening, lalu menceritakan perbedaan bayangan yang ia lihat.", teacher: "Bu Nia", teacherNote: "Anak tekun mengamati perubahan bayangan dan berani menjelaskan temuannya.", skills: ["Sains", "Bahasa", "Keberanian"] },
  { childId: "jisindo", slug: "kolase-daun", title: "Kolase Daun Musim Kering", date: "2 September 2026", time: "10.00", emoji: "🍂", secondaryEmoji: "🦋", tone: "mint", photos: 3, summary: "Mengelompokkan daun berdasarkan ukuran dan menyusunnya menjadi kolase.", description: "Anak mengelompokkan daun berdasarkan ukuran dan warna, kemudian menyusunnya menjadi bentuk kupu-kupu.", teacher: "Bu Ratna", teacherNote: "Anak bekerja sabar dan menyelesaikan susunan daun dengan mandiri.", skills: ["Kreativitas", "Motorik halus", "Klasifikasi"] },
  { childId: "jisindo", slug: "lintasan-rintangan", title: "Lintasan Rintangan", date: "31 Agustus 2026", time: "09.15", emoji: "🏃", secondaryEmoji: "🏅", tone: "peach", photos: 4, summary: "Berlatih keseimbangan dan kerja sama melalui lintasan bermain.", description: "Anak menjaga keseimbangan saat melewati balok, melompat, dan menyemangati teman satu kelompoknya.", teacher: "Bu Sinta", teacherNote: "Anak semakin percaya diri mencoba tantangan motorik baru.", skills: ["Motorik kasar", "Sosial", "Percaya diri"] },
];

export const assessments: Assessment[] = [
  { childId: "alya", slug: "perkembangan-semester-satu", title: "Perkembangan Semester 1", period: "Juli–Desember 2026", status: "Raport tersedia", teacher: "Bu Ratna", summary: "Anak berkembang baik dan konsisten pada sebagian besar area perkembangan.", note: "Terus berikan kesempatan kepada Anak untuk bercerita dan mengambil keputusan sederhana di rumah.", scores: [{ label: "Nilai Agama & Moral", level: "BSH", value: 78 }, { label: "Fisik Motorik", level: "BSB", value: 92 }, { label: "Kognitif", level: "BSH", value: 81 }, { label: "Bahasa", level: "BSH", value: 84 }, { label: "Sosial Emosional", level: "BSH", value: 86 }] },
  { childId: "alya", slug: "observasi-motorik-halus", title: "Observasi Motorik Halus", period: "Agustus 2026", status: "Dipublikasi", teacher: "Bu Ratna", summary: "Koordinasi mata dan tangan Anak menunjukkan perkembangan yang sangat baik.", note: "Latihan menggunting pola dan menyusun benda kecil dapat dilanjutkan di rumah.", scores: [{ label: "Menggunting pola", level: "BSH", value: 82 }, { label: "Menggambar bentuk", level: "BSB", value: 91 }, { label: "Koordinasi mata-tangan", level: "BSB", value: 90 }] },
  { childId: "jisindo", slug: "kemandirian-semester-satu", title: "Perkembangan Semester 1", period: "Juli–Desember 2026", status: "Dalam proses", teacher: "Bu Nia", summary: "Anak menunjukkan kemajuan pada kemandirian, motorik kasar, dan kemampuan menjelaskan pengamatan.", note: "Ajak Anak menjelaskan urutan aktivitas dan memberi pilihan tugas rumah sederhana.", scores: [{ label: "Kemandirian", level: "BSH", value: 82 }, { label: "Bahasa & Literasi", level: "MB", value: 68 }, { label: "Motorik Kasar", level: "BSB", value: 91 }, { label: "Sosial Emosional", level: "BSH", value: 80 }] },
  { childId: "jisindo", slug: "observasi-sains-awal", title: "Observasi Sains Awal", period: "September 2026", status: "Dipublikasi", teacher: "Bu Nia", summary: "Anak mampu mengamati, membandingkan, dan menceritakan hasil percobaan sederhana.", note: "Lanjutkan eksplorasi cahaya dan benda di rumah dengan pendampingan orang dewasa.", scores: [{ label: "Mengamati", level: "BSB", value: 90 }, { label: "Membandingkan", level: "BSH", value: 84 }, { label: "Menceritakan", level: "BSH", value: 80 }] },
];

export const invoices: Invoice[] = [
  { childId: "alya", slug: "alya-spp-september-2026", month: "September 2026", amount: "Rp 250.000", billAmount: 250000, paidAmount: 0, dueDate: "10 September 2026", status: "Menunggu pembayaran", statusTone: "warning", method: "—", paidAt: "—", fine: "Rp 5.000 / hari setelah jatuh tempo" },
  { childId: "alya", slug: "alya-spp-agustus-2026", month: "Agustus 2026", amount: "Rp 250.000", billAmount: 250000, paidAmount: 250000, dueDate: "10 Agustus 2026", status: "Lunas", statusTone: "success", method: "Transfer Bank", paidAt: "2 Agustus 2026", fine: "Tidak ada" },
  { childId: "alya", slug: "alya-spp-juli-2026", month: "Juli 2026", amount: "Rp 250.000", billAmount: 250000, paidAmount: 250000, dueDate: "10 Juli 2026", status: "Lunas", statusTone: "success", method: "QRIS", paidAt: "8 Juli 2026", fine: "Tidak ada" },
  { childId: "jisindo", slug: "jisindo-spp-september-2026", month: "September 2026", amount: "Rp 275.000", billAmount: 275000, paidAmount: 0, dueDate: "10 September 2026", status: "Menunggu pembayaran", statusTone: "warning", method: "—", paidAt: "—", fine: "Rp 5.000 / hari setelah jatuh tempo" },
  { childId: "jisindo", slug: "jisindo-spp-agustus-2026", month: "Agustus 2026", amount: "Rp 275.000", billAmount: 275000, paidAmount: 175000, dueDate: "10 Agustus 2026", status: "Sebagian · sisa Rp 100.000", statusTone: "partial", method: "Transfer Bank", paidAt: "19 Agustus 2026", fine: "Tidak ada" },
  { childId: "jisindo", slug: "jisindo-spp-juli-2026", month: "Juli 2026", amount: "Rp 275.000", billAmount: 275000, paidAmount: 275000, dueDate: "10 Juli 2026", status: "Lunas", statusTone: "success", method: "Transfer Bank", paidAt: "9 Juli 2026", fine: "Tidak ada" },
];

export function activitiesFor(childId: ChildId) { return activities.filter((item) => item.childId === childId); }
export function assessmentsFor(childId: ChildId) { return assessments.filter((item) => item.childId === childId); }
export function invoicesFor(childId: ChildId) { return invoices.filter((item) => item.childId === childId); }

export const child = unselectedChild;
