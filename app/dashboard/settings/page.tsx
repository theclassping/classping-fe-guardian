import PageHeader from "@/components/PageHeader";
import ProfileSettings from "@/components/ProfileSettings";
import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { selectedStudentForRequest, sessionStudentId } from "@/lib/backend";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const [{ child, studentId }, currentStudentId] = await Promise.all([
    selectedStudentForRequest(query),
    sessionStudentId(),
  ]);
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  return (
    <div className="content-page">
      <PageHeader eyebrow="PROFIL & AKUN" title="Pengaturan" description="Perbarui detail siswa dan wali murid yang terhubung ke akun Anda." />
      <ProfileSettings child={child} identity={identity} studentId={Number(studentId || currentStudentId) || undefined} />
    </div>
  );
}
