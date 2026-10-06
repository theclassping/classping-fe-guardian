import PageHeader from "@/components/PageHeader";
import ProfileSettings from "@/components/ProfileSettings";
import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { selectedStudentForRequest, sessionStudentId } from "@/lib/backend";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const [{ child, studentId }, currentStudentId] = await Promise.all([
    selectedStudentForRequest(),
    sessionStudentId(),
  ]);
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  if (!identity) redirect("/login");
  return (
    <div className="content-page">
      <PageHeader eyebrow="PROFIL & AKUN" title="Pengaturan" description="Perbarui detail siswa dan wali murid yang terhubung ke akun Anda." />
      <ProfileSettings child={child} identity={identity} studentId={Number(studentId || currentStudentId) || undefined} />
    </div>
  );
}
