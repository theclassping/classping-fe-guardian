import { describe, expect, it } from "vitest";
import { photosForStudent, studentCaption } from "@/features/activities/visibility";
describe("private student photos and shared group photos", () => {
  const photos = [...Array.from({ length: 7 }, (_, i) => ({ image_url: `student-${i+1}`, student_id: i+1, tag_state: "individual" as const })), ...Array.from({ length: 3 }, (_, i) => ({ image_url: `group-${i+1}`, student_id: null, tag_state: "group" as const }))];
  it("shows Mark's photo and all three group photos", () => {
    expect(photosForStudent(photos, 1).map(p => p.image_url)).toEqual(["student-1", "group-1", "group-2", "group-3"]);
  });
  it("shares untagged and legacy photos even next to other children's tagged photos", () => {
    const mixed = [{ image_url: "other", student_id: 2, tag_state: "individual" as const }, { image_url: "legacy", student_id: null, tag_state: "legacy" as const }, { image_url: "untagged", student_id: null }];
    expect(photosForStudent(mixed, 1).map(p => p.image_url)).toEqual(["legacy", "untagged"]);
  });
  it("hides unreviewed photos and other children's photos", () => {
    expect(photosForStudent([{ student_id: null, tag_state: "unreviewed" }, { student_id: 2, tag_state: "individual" }], 1)).toEqual([]);
  });
  it("keeps all-untagged historical galleries compatible", () => {
    const legacy = [{ image_url: "old", student_id: null, tag_state: "legacy" as const }];
    expect(photosForStudent(legacy, 1)).toEqual(legacy);
  });
  it("uses captions on the child's own photos, never another child's or a group photo's", () => {
    const captioned = [
      { student_id: 1, tag_state: "individual" as const, position: 2, caption: "Mark finished the puzzle." },
      { student_id: 1, tag_state: "individual" as const, position: 1, caption: " Mark is doing well. " },
      { student_id: 2, tag_state: "individual" as const, caption: "Private to Sarah" },
      { student_id: null, tag_state: "group" as const, caption: "Sarah and friends" },
      { student_id: 1, tag_state: "unreviewed" as const, caption: "Not reviewed yet" },
      { student_id: 1, tag_state: "individual" as const, caption: "  " },
    ];
    expect(studentCaption(captioned, 1)).toBe("Mark is doing well. Mark finished the puzzle.");
    expect(studentCaption(captioned, 3)).toBeUndefined();
    expect(studentCaption(captioned)).toBeUndefined();
  });
});
