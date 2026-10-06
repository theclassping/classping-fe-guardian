import Link from "next/link";
import { ArrowRight, Mail, Phone, UserRound } from "lucide-react";
import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { guardianForBackend, studentsForGuardian } from "@/lib/backend";
import { redirect } from "next/navigation";

export default async function GuardianProfilePage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  if (!identity) redirect("/login");
  const [students, guardian] = await Promise.all([
    identity.guardian_id ? studentsForGuardian(identity.guardian_id) : Promise.resolve(identity.students || []),
    guardianForBackend(identity.guardian_id, identity.id, identity.email),
  ]);
  const activeStudentId = query.student_id || identity.student_id;
  const initials = identity.name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="profile-page">
      <section className="profile-hero panel"><span>{initials}</span><div><p className="eyebrow">PROFIL WALI MURID</p><h1>{identity.name}</h1><p>Kelola profil dan siswa yang terhubung ke akun Anda.</p></div><Link className="outline-button" href={activeStudentId ? `/dashboard?student_id=${activeStudentId}` : "/activities"}>Kembali</Link></section>
      <div className="profile-grid">
        <section className="profile-card panel"><h2>Informasi akun</h2><dl><div><dt><UserRound /> Nama lengkap</dt><dd>{identity.name}</dd></div><div><dt><Mail /> Email</dt><dd>{identity.email}</dd></div><div><dt><Phone /> Nomor WhatsApp</dt><dd>{guardian?.phone_number || "—"}</dd></div></dl></section>
        <section className="profile-card panel"><h2>Anak terhubung</h2><div className="linked-children">{students.length ? students.map((student) => <Link key={student.id} href={`/dashboard?student_id=${student.id}`}><span>{student.initials}</span><div><strong>{student.name}</strong><small>{student.nickname || "Siswa terhubung"}</small></div><b>Buka beranda <ArrowRight /></b></Link>) : <p className="profile-empty-state">Belum ada data siswa yang terhubung.</p>}</div></section>
      </div>
    </div>
  );
}
