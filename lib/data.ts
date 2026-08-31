export const child = {
  name: "Alya Putri Ramadhani",
  firstName: "Alya",
  initials: "AP",
  className: "A1 · Matahari",
  nis: "26001",
  school: "TK Harapan Bangsa",
  academicYear: "2026/2027",
};

export const activities = [
  {
    slug: "melukis-dengan-jari",
    title: "Melukis dengan Jari",
    date: "31 Agustus 2026",
    time: "09.00",
    emoji: "🎨",
    tone: "peach",
    photos: 4,
    summary: "Alya belajar mengenal warna primer dan menciptakan warna baru.",
    description:
      "Alya terlihat antusias mencampur warna biru dan kuning. Ia mampu menyebutkan warna baru yang terbentuk dan berbagi alat dengan teman.",
    teacher: "Bu Ratna",
    teacherNote:
      "Alya sudah berani bereksperimen dan menunggu giliran saat menggunakan cat.",
    skills: ["Kreativitas", "Motorik halus", "Berbagi"],
  },
  {
    slug: "menanam-kacang-hijau",
    title: "Menanam Kacang Hijau",
    date: "31 Agustus 2026",
    time: "10.15",
    emoji: "🌱",
    tone: "mint",
    photos: 2,
    summary: "Belajar merawat tanaman dan mengamati pertumbuhan biji.",
    description:
      "Alya belajar memasukkan kapas dan biji ke dalam gelas kecil, lalu menyiramnya secukupnya. Ia dapat mengurutkan langkah kegiatan dengan baik.",
    teacher: "Bu Ratna",
    teacherNote:
      "Alya sangat teliti dan berinisiatif membantu merapikan meja setelah kegiatan.",
    skills: ["Sains awal", "Kemandirian", "Tanggung jawab"],
  },
  {
    slug: "bermain-alat-musik",
    title: "Bermain Alat Musik",
    date: "28 Agustus 2026",
    time: "11.00",
    emoji: "🎵",
    tone: "lavender",
    photos: 3,
    summary: "Mengenal ritme sederhana menggunakan tamborin dan marakas.",
    description:
      "Alya mengikuti pola ketukan sederhana dan dapat membedakan bunyi keras serta pelan bersama teman-temannya.",
    teacher: "Bu Nia",
    teacherNote:
      "Alya mengikuti instruksi dengan baik dan semakin percaya diri tampil di depan kelas.",
    skills: ["Seni", "Konsentrasi", "Percaya diri"],
  },
] as const;

export const assessments = [
  {
    slug: "perkembangan-semester-satu",
    title: "Perkembangan Semester 1",
    period: "Juli–Desember 2026",
    status: "Raport tersedia",
    summary: "Alya berkembang baik dan konsisten pada sebagian besar area perkembangan.",
    note: "Terus berikan kesempatan kepada Alya untuk bercerita dan mengambil keputusan sederhana di rumah.",
    teacher: "Bu Ratna",
    scores: [
      { label: "Nilai Agama & Moral", level: "BSH", value: 78 },
      { label: "Fisik Motorik", level: "BSB", value: 92 },
      { label: "Kognitif", level: "BSH", value: 81 },
      { label: "Bahasa", level: "BSH", value: 84 },
      { label: "Sosial Emosional", level: "BSH", value: 86 },
    ],
  },
  {
    slug: "observasi-motorik-halus",
    title: "Observasi Motorik Halus",
    period: "Agustus 2026",
    status: "Dipublikasi",
    summary: "Koordinasi mata dan tangan Alya menunjukkan perkembangan yang sangat baik.",
    note: "Latihan menggunting pola dan menyusun benda kecil dapat dilanjutkan di rumah.",
    teacher: "Bu Ratna",
    scores: [
      { label: "Menggunting pola", level: "BSH", value: 82 },
      { label: "Menggambar bentuk", level: "BSB", value: 91 },
      { label: "Koordinasi mata-tangan", level: "BSB", value: 90 },
    ],
  },
] as const;

export const invoices = [
  {
    slug: "spp-september-2026",
    month: "September 2026",
    amount: "Rp 250.000",
    dueDate: "10 September 2026",
    status: "Menunggu pembayaran",
    statusTone: "warning",
    method: "—",
    paidAt: "—",
    fine: "Rp 5.000 / hari setelah jatuh tempo",
  },
  {
    slug: "spp-agustus-2026",
    month: "Agustus 2026",
    amount: "Rp 250.000",
    dueDate: "10 Agustus 2026",
    status: "Lunas",
    statusTone: "success",
    method: "Transfer Bank",
    paidAt: "2 Agustus 2026",
    fine: "Tidak ada",
  },
  {
    slug: "spp-juli-2026",
    month: "Juli 2026",
    amount: "Rp 250.000",
    dueDate: "10 Juli 2026",
    status: "Lunas",
    statusTone: "success",
    method: "QRIS",
    paidAt: "8 Juli 2026",
    fine: "Tidak ada",
  },
  {
    slug: "spp-juni-2026",
    month: "Juni 2026",
    amount: "Rp 265.000",
    dueDate: "10 Juni 2026",
    status: "Lunas + denda",
    statusTone: "late",
    method: "Transfer Bank",
    paidAt: "13 Juni 2026",
    fine: "Rp 15.000",
  },
] as const;

export type Activity = (typeof activities)[number];
export type Assessment = (typeof assessments)[number];
export type Invoice = (typeof invoices)[number];
