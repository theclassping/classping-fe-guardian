import { describe, expect, it } from "vitest";
import { placeholderAssessments } from "@/features/assessments/placeholder";
import { UNKNOWN_CHILD } from "@/features/family/types";

describe("placeholder data", () => {
  it("shows a neutral child profile without invented details while the child cannot be loaded", () => {
    expect(UNKNOWN_CHILD).toEqual({ name: "Siswa", firstName: "Siswa", initials: "S", className: "Kelas belum tersedia" });
  });

  it("keeps the two sample assessment reports until assessments are connected to the backend", () => {
    expect(placeholderAssessments.map((item) => item.slug)).toEqual(["perkembangan-semester-satu", "observasi-motorik-halus"]);
  });
});
