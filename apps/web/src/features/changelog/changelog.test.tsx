import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { APP_VERSION, CHANGELOG, formatTimestamp, parseChangelog } from "./changelog";
import { ChangelogPage } from "./ChangelogPage";

const SAMPLE = `# Changelog

Einleitung

## [1.1.0] – 2026-11-22 14:08

### Behoben
- **Fehler** mit \`Code\` und langem Text, der
  umgebrochen weitergeht.

## [1.0.0] – 2026-11-21
- Erste Version
`;

describe("parseChangelog", () => {
  it("liest Version, Zeitstempel und fügt umgebrochene Punkte zusammen", () => {
    const entries = parseChangelog(SAMPLE);
    expect(entries.map((e) => e.version)).toEqual(["1.1.0", "1.0.0"]);
    expect(entries[0]?.timestamp).toBe("2026-11-22 14:08");
    expect(entries[0]?.body).toContain(
      "- **Fehler** mit Code und langem Text, der umgebrochen weitergeht.",
    );
    expect(entries[1]?.timestamp).toBe("2026-11-21");
  });

  it("formatiert Zeitstempel deutsch", () => {
    expect(formatTimestamp("2026-11-22 14:08")).toBe("22.11.2026, 14:08 Uhr");
    expect(formatTimestamp("2026-11-21")).toBe("21.11.2026");
  });
});

describe("echtes CHANGELOG.md", () => {
  it("hat für jede Version Datum und Uhrzeit, neueste zuerst", () => {
    expect(CHANGELOG.length).toBeGreaterThan(10);
    for (const entry of CHANGELOG) {
      expect(entry.timestamp, entry.version).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    }
    const stamps = CHANGELOG.map((e) => e.timestamp);
    expect([...stamps].sort().reverse()).toEqual(stamps);
    expect(APP_VERSION).toBe(CHANGELOG[0]?.version);
  });

  it("zeigt das Protokoll in der App", () => {
    render(
      <MemoryRouter>
        <ChangelogPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Änderungsprotokoll" })).toBeInTheDocument();
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText("Version 0.0.1")).toBeInTheDocument();
  });
});
