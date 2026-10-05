import { Clock3, Mail, MapPin, Phone, ShieldCheck, UsersRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { schoolForBackend } from "@/lib/backend";
import { getChild } from "@/lib/data";

export default async function SchoolPage({ searchParams }: { searchParams: Promise<{ student_id?: string }> }) {
  const query = await searchParams;
  const school = query.student_id ? await schoolForBackend(Number(query.student_id)) : null;
  const child = getChild();
  const schoolName = school?.name || child.school;
  const academicYear = school?.academic_year || child.academicYear;
  return (
    <div className="content-page">
      <PageHeader eyebrow="SEKOLAH ANAK" title="Profil Sekolah" description={`Informasi resmi dan kontak ${schoolName}.`} />
      <section className="school-profile-hero panel">
        <span className="school-logo">TK</span>
        <div><span className="active-chip">Terdaftar di ClassPing</span><h2>{schoolName}</h2><p>{school?.npsn ? `NPSN ${school.npsn} · ` : ""}Tahun Ajaran {academicYear}</p></div>
      </section>
      <section className="school-info-grid">
        <article className="panel info-card"><MapPin /><div><small>ALAMAT</small><strong>{school?.address || "Belum tersedia"}</strong><p>Alamat sekolah</p></div></article>
        <article className="panel info-card"><Phone /><div><small>TELEPON</small><strong>{school?.phone_number || "Belum tersedia"}</strong><p>Kontak sekolah</p></div></article>
        <article className="panel info-card"><Mail /><div><small>EMAIL</small><strong>{school?.email || "Belum tersedia"}</strong><p>Kontak administrasi sekolah</p></div></article>
        <article className="panel info-card"><Clock3 /><div><small>JAM SEKOLAH</small><strong>07.30–11.30 WIB</strong><p>Penjemputan mulai pukul 11.15</p></div></article>
      </section>
      <section className="school-about panel"><div><UsersRound /><div><h2>Tentang kami</h2><p>{school?.description || "Informasi sekolah belum tersedia."}</p></div></div><div><ShieldCheck /><div><h2>Kontak terverifikasi</h2><p>Informasi pada halaman ini dikelola langsung oleh administrator sekolah.</p></div></div></section>
    </div>
  );
}
