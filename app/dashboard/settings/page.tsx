import PageHeader from "@/components/PageHeader";
import ProfileSettings from "@/features/family/components/ProfileSettings";
import { selectedStudentForRequest, sessionIdentity } from "@/features/family/api";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const [{ child, numericStudentId }, identity] = await Promise.all([selectedStudentForRequest(), sessionIdentity()]);
  if (!identity) redirect("/login");
  return (
    <div className="content-page">
      <PageHeader eyebrow="PROFIL & AKUN" title="Pengaturan" description="Perbarui detail siswa dan wali murid yang terhubung ke akun Anda." />
      <ProfileSettings child={child} identity={identity} studentId={numericStudentId} />
    </div>
  );
}
