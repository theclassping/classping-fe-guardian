export type GuardianIdentity = {
  name: string;
  email: string;
  role: "PARENT" | "ADMIN";
};

export function encodeIdentity(identity: GuardianIdentity) {
  return Buffer.from(JSON.stringify(identity), "utf8").toString("base64url");
}

export function decodeIdentity(value?: string): GuardianIdentity {
  const fallback: GuardianIdentity = {
    name: "Rina Ramadhani",
    email: "ani.dua.anak@gmail.com",
    role: "PARENT",
  };

  if (!value) return fallback;

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
    return fallback;
  }

  return fallback;
}
