import { describe, expect, it } from "vitest";
import {
  activitiesFor,
  assessmentsFor,
  children,
  getChild,
  invoicesFor,
  unselectedChild,
} from "@/lib/data";

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
