import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

describe("Berufsfarbe blendet weich über", () => {
  it("registriert die Akzentfarben als Farb-Eigenschaften", () => {
    for (const name of ["--accent", "--accent-dark", "--accent-soft"]) {
      expect(css).toMatch(new RegExp(`@property ${name} \\{\\s*syntax: "<color>";\\s*inherits: true;`));
    }
  });

  it("überblendet Hintergrund und App langsam und respektiert reduzierte Bewegung", () => {
    expect(css).toMatch(/\.app-backdrop \{[\s\S]*?transition:\s*--accent 1\.2s/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.app-backdrop \{ transition: none; \}/);
    expect(css).toMatch(/color-mix\(in srgb, var\(--accent\) \d+%, #2a2461\)/);
  });
});
