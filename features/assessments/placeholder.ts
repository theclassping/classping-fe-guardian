// Placeholder content: the assessments pages are not linked from the menu and not yet connected to the
// backend (apps/assessments). Every child currently sees these two sample reports.
export type Assessment = {
  slug: string;
  title: string;
  period: string;
  status: string;
  summary: string;
  note: string;
  teacher: string;
  scores: { label: string; level: string; value: number }[];
};

export const placeholderAssessments: Assessment[] = [
  { slug: "perkembangan-semester-satu", title: "Perkembangan Semester 1", period: "Juli–Desember 2026", status: "Raport tersedia", teacher: "Bu Ratna", summary: "Anak berkembang baik dan konsisten pada sebagian besar area perkembangan.", note: "Terus berikan kesempatan kepada Anak untuk bercerita dan mengambil keputusan sederhana di rumah.", scores: [{ label: "Nilai Agama & Moral", level: "BSH", value: 78 }, { label: "Fisik Motorik", level: "BSB", value: 92 }, { label: "Kognitif", level: "BSH", value: 81 }, { label: "Bahasa", level: "BSH", value: 84 }, { label: "Sosial Emosional", level: "BSH", value: 86 }] },
  { slug: "observasi-motorik-halus", title: "Observasi Motorik Halus", period: "Agustus 2026", status: "Dipublikasi", teacher: "Bu Ratna", summary: "Koordinasi mata dan tangan Anak menunjukkan perkembangan yang sangat baik.", note: "Latihan menggunting pola dan menyusun benda kecil dapat dilanjutkan di rumah.", scores: [{ label: "Menggunting pola", level: "BSH", value: 82 }, { label: "Menggambar bentuk", level: "BSB", value: 91 }, { label: "Koordinasi mata-tangan", level: "BSB", value: 90 }] },
];
