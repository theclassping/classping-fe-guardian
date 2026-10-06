import { describe, expect, it } from "vitest";
import { decodeIdentity, encodeIdentity, type GuardianIdentity } from "@/lib/auth";

describe("guardian identity encoding", () => {
  const identity: GuardianIdentity = {
    name: "Guardian Example",
    email: "guardian@example.test",
    role: "PARENT",
  };

  it("round-trips a valid identity through the cookie value", () => {
    expect(decodeIdentity(encodeIdentity(identity))).toEqual(identity);
  });

  it("returns no identity when the cookie is absent or malformed", () => {
    expect(decodeIdentity()).toBeNull();
    expect(decodeIdentity("not-valid-base64-json")).toBeNull();
  });

  it("rejects identities with an unsupported role", () => {
    const invalid = Buffer.from(
      JSON.stringify({ ...identity, role: "STUDENT" }),
      "utf8",
    ).toString("base64url");

    expect(decodeIdentity(invalid)).toBeNull();
  });
});
