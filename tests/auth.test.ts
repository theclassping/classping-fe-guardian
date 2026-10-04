import { describe, expect, it } from "vitest";
import { decodeIdentity, encodeIdentity, type GuardianIdentity } from "@/lib/auth";

describe("guardian identity encoding", () => {
  const identity: GuardianIdentity = {
    name: "Rina Ramadhani",
    email: "rina@example.com",
    role: "PARENT",
  };

  it("round-trips a valid identity through the cookie value", () => {
    expect(decodeIdentity(encodeIdentity(identity))).toEqual(identity);
  });

  it("returns the fallback identity when the cookie is absent or malformed", () => {
    expect(decodeIdentity()).toEqual({
      name: "Rina Ramadhani",
      email: "ani.dua.anak@gmail.com",
      role: "PARENT",
    });
    expect(decodeIdentity("not-valid-base64-json")).toEqual(decodeIdentity());
  });

  it("rejects identities with an unsupported role", () => {
    const invalid = Buffer.from(
      JSON.stringify({ ...identity, role: "STUDENT" }),
      "utf8",
    ).toString("base64url");

    expect(decodeIdentity(invalid)).toEqual(decodeIdentity());
  });
});
