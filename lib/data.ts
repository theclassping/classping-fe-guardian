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
  /** Backend class and branch IDs used when requesting an upload URL. */
  classId?: number;
  branchId?: number;
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
  /** ISO timestamp of the activity, used to pick the latest one. */
  occurredAt?: string;
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
  feeType: string;
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
  paymentId?: number;
  paymentMethod?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  proofUrl?: string;
  invoiceNo?: string;
  /** ISO invoice date, used to pick the latest bill. */
  invoiceDate?: string;
  /** Backend student id, used to scope online payments. */
  studentId?: number;
  /** `payable_via_gateway` from the API: unpaid/overdue, not locked, no manual payment in progress. */
  payableViaGateway?: boolean;
  /** `pending_gateway_payment` from the API: the checkout that currently locks this invoice. */
  pendingGatewayPayment?: import("@/lib/gateway").PendingGatewayPayment;
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

// Placeholder content: the assessments pages are not linked from the menu and not yet connected to the backend.
export const assessments: Assessment[] = [
  { childId: "alya", slug: "perkembangan-semester-satu", title: "Perkembangan Semester 1", period: "Juli–Desember 2026", status: "Raport tersedia", teacher: "Bu Ratna", summary: "Anak berkembang baik dan konsisten pada sebagian besar area perkembangan.", note: "Terus berikan kesempatan kepada Anak untuk bercerita dan mengambil keputusan sederhana di rumah.", scores: [{ label: "Nilai Agama & Moral", level: "BSH", value: 78 }, { label: "Fisik Motorik", level: "BSB", value: 92 }, { label: "Kognitif", level: "BSH", value: 81 }, { label: "Bahasa", level: "BSH", value: 84 }, { label: "Sosial Emosional", level: "BSH", value: 86 }] },
  { childId: "alya", slug: "observasi-motorik-halus", title: "Observasi Motorik Halus", period: "Agustus 2026", status: "Dipublikasi", teacher: "Bu Ratna", summary: "Koordinasi mata dan tangan Anak menunjukkan perkembangan yang sangat baik.", note: "Latihan menggunting pola dan menyusun benda kecil dapat dilanjutkan di rumah.", scores: [{ label: "Menggunting pola", level: "BSH", value: 82 }, { label: "Menggambar bentuk", level: "BSB", value: 91 }, { label: "Koordinasi mata-tangan", level: "BSB", value: 90 }] },
  { childId: "jisindo", slug: "kemandirian-semester-satu", title: "Perkembangan Semester 1", period: "Juli–Desember 2026", status: "Dalam proses", teacher: "Bu Nia", summary: "Anak menunjukkan kemajuan pada kemandirian, motorik kasar, dan kemampuan menjelaskan pengamatan.", note: "Ajak Anak menjelaskan urutan aktivitas dan memberi pilihan tugas rumah sederhana.", scores: [{ label: "Kemandirian", level: "BSH", value: 82 }, { label: "Bahasa & Literasi", level: "MB", value: 68 }, { label: "Motorik Kasar", level: "BSB", value: 91 }, { label: "Sosial Emosional", level: "BSH", value: 80 }] },
  { childId: "jisindo", slug: "observasi-sains-awal", title: "Observasi Sains Awal", period: "September 2026", status: "Dipublikasi", teacher: "Bu Nia", summary: "Anak mampu mengamati, membandingkan, dan menceritakan hasil percobaan sederhana.", note: "Lanjutkan eksplorasi cahaya dan benda di rumah dengan pendampingan orang dewasa.", scores: [{ label: "Mengamati", level: "BSB", value: 90 }, { label: "Membandingkan", level: "BSH", value: 84 }, { label: "Menceritakan", level: "BSH", value: 80 }] },
];

export function assessmentsFor(childId: ChildId) { return assessments.filter((item) => item.childId === childId); }

