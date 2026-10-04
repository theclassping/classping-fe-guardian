import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import GuardianShell from "@/components/layout/GuardianShell";
import { decodeIdentity } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (cookieStore.get("access_token")?.value.startsWith("classping-guardian-demo")) {
    redirect("/login");
  }
  const identity = decodeIdentity(cookieStore.get("guardian_identity")?.value);
  if (!identity.student_id && !identity.students?.length) {
    redirect("/login");
  }
  return <GuardianShell identity={identity}>{children}</GuardianShell>;
}
