import PageHeader from "@/components/PageHeader";
import ProfileSettings from "@/components/ProfileSettings";
import { cookies } from "next/headers";
import { decodeIdentity } from "@/lib/auth";
import { getChild } from "@/lib/data";
import { studentForBackend } from "@/lib/backend";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ child?: string; student_id?: string }> }) {
  const query = await searchParams;
  const fallback = getChild(query.child);
  const child = query.student_id ? await studentForBackend(Number(query.student_id), fallback) : fallback;
  const identity = decodeIdentity((await cookies()).get("guardian_identity")?.value);
  return (
    <div className="content-page">
      <PageHeader eyebrow="PROFIL & AKUN" title="Pengaturan" description="Perbarui detail siswa dan wali murid yang terhubung ke akun Anda." />
      <ProfileSettings child={child} identity={identity} />
    </div>
  );
}
