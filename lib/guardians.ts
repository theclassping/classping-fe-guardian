import type { GuardianIdentity } from "@/lib/auth";

export type GuardianProfile = {
  id?: number;
  user_id?: number;
  name: string;
  email: string;
  phone_number: string;
  relationship: string;
  is_primary: boolean;
};

export type NewGuardianProfile = GuardianProfile & { first_name: string; last_name: string };

export function isCurrentGuardian(guardian: GuardianProfile, identity: GuardianIdentity) {
  if (guardian.user_id && identity.id) return guardian.user_id === identity.id;
  return Boolean(guardian.id && identity.guardian_id && guardian.id === identity.guardian_id);
}

export function linkedGuardianProfiles(student: Record<string, unknown>, details: Record<string, Record<string, unknown>> = {}): GuardianProfile[] {
  const relations = Array.isArray(student.student_guardians) ? student.student_guardians : [];
  return relations.flatMap((relation) => {
    const guardian = relation.guardian || details[String(relation.guardian_id)] || { id: relation.guardian_id, name: relation.guardian_name, email: relation.guardian_email, phone_number: relation.guardian_phone_number };
    if (!guardian || typeof guardian !== "object") return [];
    const userId = typeof guardian.user === "object" && guardian.user ? guardian.user.id : guardian.user ?? guardian.user_id;
    return [{
      id: Number(guardian.id) || undefined,
      user_id: Number(userId) || undefined,
      name: String(guardian.name || ""),
      email: String(guardian.email || ""),
      phone_number: String(guardian.phone_number || ""),
      relationship: String(relation.relationship || "other"),
      is_primary: Boolean(relation.is_primary),
    }];
  });
}

export function backendErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string") return payload.trim() || fallback;
  if (Array.isArray(payload)) return payload.map((item) => backendErrorMessage(item, "")).filter(Boolean).join(" ") || fallback;
  if (payload && typeof payload === "object") {
    const values = Object.entries(payload);
    const detail = values.find(([key]) => key === "detail");
    if (detail) return backendErrorMessage(detail[1], fallback);
    return values.map(([key, value]) => {
      const message = backendErrorMessage(value, "");
      const labels: Record<string, string> = { name: "Nama", first_name: "Nama depan", last_name: "Nama belakang", email: "Email", phone_number: "Nomor WhatsApp", student_guardians: "Wali murid", relationship: "Hubungan dengan siswa", user: "", non_field_errors: "" };
      const label = labels[key] ?? key;
      return message ? label ? `${label}: ${message}` : message : "";
    }).filter(Boolean).join(" ") || fallback;
  }
  return fallback;
}

export function newGuardianLink(guardian: NewGuardianProfile) {
  return {
    user: {
      email: guardian.email.trim().toLowerCase(),
      first_name: guardian.first_name.trim(),
      last_name: guardian.last_name.trim(),
      phone_number: guardian.phone_number.trim(),
    },
    relationship: guardian.relationship,
    is_primary: guardian.is_primary,
  };
}
