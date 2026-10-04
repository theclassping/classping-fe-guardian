import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("global styling contract", () => {
  it("defines the main application layout and responsive navigation styles", () => {
    expect(stylesheet).toContain(".portal-shell");
    expect(stylesheet).toContain(".sidebar");
    expect(stylesheet).toContain(".portal-page");
    expect(stylesheet).toContain(".mobile-menu");
    expect(stylesheet).toMatch(/@media\s*\([^)]*(?:max-width|min-width)[^)]*\)/);
  });

  it("includes visible keyboard focus styles", () => {
    expect(stylesheet).toMatch(/:focus-visible\s*\{/);
    expect(stylesheet).toContain("outline");
  });

  it("styles the shared panels, buttons, search fields, and empty states", () => {
    for (const selector of [
      ".panel",
      ".primary-button",
      ".outline-button",
      ".list-search",
      ".empty-state",
    ]) {
      expect(stylesheet).toContain(selector);
    }
  });

  it("contains styles for the supported activity tones", () => {
    for (const tone of [".peach", ".mint", ".lavender", ".blue"]) {
      expect(stylesheet).toContain(tone);
    }
  });

  it("keeps reduced-motion users in mind", () => {
    expect(stylesheet).toMatch(/prefers-reduced-motion/);
  });
});
