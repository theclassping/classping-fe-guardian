import { describe, expect, it } from "vitest";
import {
  activitiesFor,
  assessmentsFor,
  children,
  getChild,
  invoicesFor,
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

  it("returns only records belonging to the requested child", () => {
    expect(activitiesFor("alya").every((item) => item.childId === "alya")).toBe(true);
    expect(assessmentsFor("jisindo").every((item) => item.childId === "jisindo")).toBe(true);
    expect(invoicesFor("alya").every((item) => item.childId === "alya")).toBe(true);
  });

  it("keeps the expected record counts for both children", () => {
    expect(activitiesFor("alya")).toHaveLength(3);
    expect(activitiesFor("jisindo")).toHaveLength(3);
    expect(assessmentsFor("alya")).toHaveLength(2);
    expect(assessmentsFor("jisindo")).toHaveLength(2);
    expect(invoicesFor("alya")).toHaveLength(3);
    expect(invoicesFor("jisindo")).toHaveLength(3);
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
