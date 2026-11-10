import { describe, expect, it } from "vitest";
import {
  assessmentsFor,
  children,
  getChild,
  unselectedChild,
} from "@/lib/data";
import { activeClassStudent } from "@/lib/backend";

describe("child data selectors", () => {
  it("uses a neutral profile when no child is selected", () => {
    expect(getChild()).toEqual(unselectedChild);
    expect(getChild("unknown")).toEqual(unselectedChild);
    expect(getChild().name).toBe("Siswa");
  });

  it("selects Jisindo only for the jisindo id", () => {
    expect(getChild("jisindo")).toEqual(children.jisindo);
  });

  it("returns only the placeholder assessments of the requested child", () => {
    expect(assessmentsFor("jisindo").every((item) => item.childId === "jisindo")).toBe(true);
    expect(assessmentsFor("alya")).toHaveLength(2);
    expect(assessmentsFor("jisindo")).toHaveLength(2);
  });
});

describe("active class selection", () => {
  it("always selects the current class and never an older assignment", () => {
    expect(activeClassStudent([
      { class_id: 10, is_current: false },
      { class_id: 20, is_current: true },
    ])?.class_id).toBe(20);
  });

  it("does not fall back to a non-current class", () => {
    expect(activeClassStudent([{ class_id: 10, is_current: false }])).toBeUndefined();
  });
});
