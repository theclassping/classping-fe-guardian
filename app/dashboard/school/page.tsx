import { Clock3, Mail, MapPin, Phone, ShieldCheck, UsersRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function SchoolPage() {
  return (
    <div className="content-page">
      <PageHeader eyebrow="SEKOLAH ANAK" title="Profil Sekolah" description="Informasi resmi dan kontak TK Harapan Bangsa." />
      <section className="school-profile-hero panel">
        <span className="school-logo">TK</span>
        <div><span className="active-chip">Terdaftar di ClassPing</span><h2>TK Harapan Bangsa</h2><p>NPSN 69912345 · Tahun Ajaran 2026/2027</p></div>
      </section>
      <section className="school-info-grid">
        <article className="panel info-card"><MapPin /><div><small>ALAMAT</small><strong>Jl. Melati No. 18, Jakarta Selatan</strong><p>Kebayoran Baru, DKI Jakarta 12160</p></div></article>
        <article className="panel info-card"><Phone /><div><small>TELEPON</small><strong>(021) 722-1908</strong><p>Senin–Jumat, 07.00–15.00 WIB</p></div></article>
        <article className="panel info-card"><Mail /><div><small>EMAIL</small><strong>halo@tkharapanbangsa.sch.id</strong><p>Untuk administrasi dan informasi umum</p></div></article>
        <article className="panel info-card"><Clock3 /><div><small>JAM SEKOLAH</small><strong>07.30–11.30 WIB</strong><p>Penjemputan mulai pukul 11.15</p></div></article>
      </section>
      <section className="school-about panel"><div><UsersRound /><div><h2>Tentang kami</h2><p>TK Harapan Bangsa mendampingi anak belajar melalui pengalaman bermain yang aman, hangat, dan bermakna. Sekolah bekerja bersama keluarga untuk mendukung tumbuh kembang setiap anak.</p></div></div><div><ShieldCheck /><div><h2>Kontak terverifikasi</h2><p>Informasi pada halaman ini dikelola langsung oleh administrator sekolah.</p></div></div></section>
    </div>
  );
}
