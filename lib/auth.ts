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

export function decodeIdentity(value?: string): GuardianIdentity | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<GuardianIdentity>;

    if (
      typeof parsed.name === "string" &&
      typeof parsed.email === "string" &&
      (parsed.role === "PARENT" || parsed.role === "ADMIN")
    ) {
      return parsed as GuardianIdentity;
    }
  } catch {
    return null;
  }

  return null;
}
