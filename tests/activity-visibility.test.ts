import { describe, expect, it } from "vitest";
import { photosForStudent, studentRemark } from "@/lib/activityVisibility";
describe("private student photos and shared group photos", () => {
  const photos = [...Array.from({ length: 7 }, (_, i) => ({ image_url: `student-${i+1}`, student_id: i+1, tag_state: "individual" as const })), ...Array.from({ length: 3 }, (_, i) => ({ image_url: `group-${i+1}`, student_id: null, tag_state: "group" as const }))];
  it("shows Mark's photo and all three group photos", () => {
    expect(photosForStudent(photos, 1).map(p => p.image_url)).toEqual(["student-1", "group-1", "group-2", "group-3"]);
  });
  it("does not treat unreviewed or mixed legacy photos as shared", () => {
    expect(photosForStudent([{ student_id: null, tag_state: "unreviewed" }, { student_id: 2, tag_state: "individual" }, { student_id: null, tag_state: "legacy" }], 1)).toEqual([]);
  });
  it("keeps all-untagged historical galleries compatible", () => {
    const legacy = [{ image_url: "old", student_id: null, tag_state: "legacy" as const }];
    expect(photosForStudent(legacy, 1)).toEqual(legacy);
  });
  it("never substitutes another child's remark", () => {
    const remarks = [{ student_id: 1, remark: " Mark is doing well. " }, { student_id: 2, remark: "Private to Sarah" }];
    expect(studentRemark(remarks, 1)).toBe("Mark is doing well.");
    expect(studentRemark(remarks, 3)).toBeUndefined();
    expect(studentRemark(remarks)).toBeUndefined();
  });
});
