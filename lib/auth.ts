import { decodeBase64UrlJson } from "@/lib/base64url";

export type LinkedStudent = { id: number; name: string; nickname?: string; initials: string };

export type GuardianIdentity = {
  id?: number;
  guardian_id?: number;
  student_id?: number;
  students?: LinkedStudent[];
  name: string;
  email: string;
  role: "PARENT" | "ADMIN";
};

export function encodeIdentity(identity: GuardianIdentity) {
  return Buffer.from(JSON.stringify(identity), "utf8").toString("base64url");
}

/** Reads the identity cookie; `null` when it is missing or not a guardian identity. */
export function decodeIdentity(value?: string): GuardianIdentity | null {
  const parsed = decodeBase64UrlJson<Partial<GuardianIdentity>>(value);
  if (
    parsed &&
    typeof parsed.name === "string" &&
    typeof parsed.email === "string" &&
    (parsed.role === "PARENT" || parsed.role === "ADMIN")
  ) {
    return parsed as GuardianIdentity;
  }
  return null;
}

/** Ids of the students this guardian may view. */
export function linkedStudentIds(identity: Pick<GuardianIdentity, "student_id" | "students">) {
  return new Set([
    ...(identity.student_id ? [identity.student_id] : []),
    ...(identity.students || []).map((student) => student.id),
  ].filter((id) => Number.isInteger(id) && id > 0));
}
