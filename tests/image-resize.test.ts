import { describe, expect, it } from "vitest";
import { resizedDimensions } from "@/lib/imageResize";

describe("resizedDimensions", () => {
  it("scales the longest side down to the limit and keeps the aspect ratio", () => {
    expect(resizedDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(resizedDimensions(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges small images", () => {
    expect(resizedDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
