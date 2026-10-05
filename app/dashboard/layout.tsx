import { cookies } from "next/headers";
import GuardianShell from "@/components/layout/GuardianShell";
import { decodeIdentity } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const identity = decodeIdentity(cookieStore.get("guardian_identity")?.value);
  return <GuardianShell identity={identity}>{children}</GuardianShell>;
}
