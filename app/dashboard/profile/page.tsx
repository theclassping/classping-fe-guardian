import Link from "next/link";
import { ArrowRight, Mail, Phone, UserRound } from "lucide-react";
import { children, getChild } from "@/lib/data";

export default async function GuardianProfilePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const query = await searchParams;
  const activeChild = getChild(query.child);
  return (
    <div className="profile-page">
      <section className="profile-hero panel"><span>RR</span><div><p className="eyebrow">PROFIL WALI MURID</p><h1>Rina Ramadhani</h1><p>Akun keluarga untuk mengikuti perkembangan Alya dan Jisindo di TK Harapan Bangsa.</p></div><Link className="outline-button" href={`/dashboard?child=${activeChild.id}`}>Kembali</Link></section>
      <div className="profile-grid">
        <section className="profile-card panel"><h2>Informasi akun</h2><dl><div><dt><UserRound /> Nama lengkap</dt><dd>Rina Ramadhani</dd></div><div><dt><Mail /> Email</dt><dd>ani.dua.anak@gmail.com</dd></div><div><dt><Phone /> Nomor WhatsApp</dt><dd>0812-3456-7801</dd></div></dl></section>
        <section className="profile-card panel"><h2>Anak terhubung</h2><div className="linked-children">{Object.values(children).map((child) => <Link key={child.id} href={`/dashboard?child=${child.id}`}><span className={child.id}>{child.initials}</span><div><strong>{child.name}</strong><small>Kelas {child.className} · NIS {child.nis}</small></div><b>Buka beranda <ArrowRight /></b></Link>)}</div></section>
      </div>
    </div>
  );
}
