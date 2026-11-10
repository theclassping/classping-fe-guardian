import Link from "next/link";
import { Mail, Phone, UserRound } from "lucide-react";
import { guardianForBackend, linkedStudentsForGuardian, sessionIdentity, sessionStudentId } from "@/lib/backend";
import { initialsOf } from "@/lib/format";
import LinkedStudentActivityLink from "@/components/LinkedStudentActivityLink";
import { redirect } from "next/navigation";

export default async function GuardianProfilePage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const identity = await sessionIdentity();
  if (!identity) redirect("/login");
  const currentStudentId = await sessionStudentId();
  const [linkedStudents, guardian] = await Promise.all([
    currentStudentId ? linkedStudentsForGuardian(currentStudentId) : Promise.resolve([]),
    guardianForBackend(identity.guardian_id, identity.id, identity.email),
  ]);
  // The backend's list; the students saved at login when it cannot be read.
  const students = linkedStudents.length ? linkedStudents : identity.students || [];
  const displayName = guardian?.name?.trim() || identity.name;
  const activeStudentId = query.student_id || currentStudentId || identity.student_id;
  const initials = initialsOf(displayName);
  return (
    <div className="profile-page">
      <section className="profile-hero panel"><span>{initials}</span><div><p className="eyebrow">PROFIL WALI MURID</p><h1>{displayName}</h1><p>Kelola profil dan siswa yang terhubung ke akun Anda.</p></div><Link className="outline-button" href="/dashboard/activities">Kembali</Link></section>
      <div className="profile-grid">
        <section className="profile-card panel"><h2>Informasi akun</h2><dl><div><dt><UserRound /> Nama lengkap</dt><dd>{displayName}</dd></div><div><dt><Mail /> Email</dt><dd>{identity.email}</dd></div><div><dt><Phone /> Nomor WhatsApp</dt><dd>{guardian?.phone_number || "—"}</dd></div></dl></section>
        <section className="profile-card panel"><h2>Anak terhubung</h2><div className="linked-children">{students.length ? students.map((student) => <LinkedStudentActivityLink key={student.id} student={student} selectedStudentId={activeStudentId ? Number(activeStudentId) : undefined} />) : <p className="profile-empty-state">Belum ada data siswa yang terhubung.</p>}</div></section>
      </div>
    </div>
  );
}
