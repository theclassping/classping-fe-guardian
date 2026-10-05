import { Clock3, Mail, MapPin, Phone, ShieldCheck, UsersRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { schoolForBackend, sessionStudentId } from "@/lib/backend";

export default async function SchoolPage() {
  const studentId = await sessionStudentId();
  const school = studentId ? await schoolForBackend(studentId) : null;
  const schoolName = school?.name || "Sekolah belum tersedia";
  const academicYear = school?.academic_year || "Belum tersedia";
  const schoolInitials = school?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SK";
  return (
    <div className="content-page">
      <PageHeader eyebrow="SEKOLAH ANAK" title="Profil Sekolah" description={`Informasi resmi dan kontak ${schoolName}.`} />
      <section className="school-profile-hero panel">
        <span className="school-logo">{schoolInitials}</span>
        <div>{school && <span className="active-chip">Terdaftar di ClassPing</span>}<h2>{schoolName}</h2><p>{school?.register_number ? `No. Registrasi ${school.register_number} · ` : ""}{school?.branch_name ? `${school.branch_name} · ` : ""}Tahun Ajaran {academicYear}</p></div>
      </section>
      <section className="school-info-grid">
        <article className="panel info-card"><MapPin /><div><small>ALAMAT</small><strong>{school?.address || "Belum tersedia"}</strong><p>Alamat sekolah</p></div></article>
        <article className="panel info-card"><Phone /><div><small>TELEPON</small><strong>{school?.phone_number || "Belum tersedia"}</strong><p>Kontak sekolah</p></div></article>
        <article className="panel info-card"><Mail /><div><small>EMAIL</small><strong>{school?.email || "Belum tersedia"}</strong><p>Kontak administrasi sekolah</p></div></article>
        <article className="panel info-card"><Clock3 /><div><small>JAM SEKOLAH</small><strong>Belum tersedia</strong><p>Jam operasional sekolah</p></div></article>
      </section>
      <section className="school-about panel"><div><UsersRound /><div><h2>Tentang kami</h2><p>{school?.description || "Informasi sekolah belum tersedia."}</p></div></div><div><ShieldCheck /><div><h2>Kontak terverifikasi</h2><p>Informasi pada halaman ini dikelola langsung oleh administrator sekolah.</p></div></div></section>
    </div>
  );
}
