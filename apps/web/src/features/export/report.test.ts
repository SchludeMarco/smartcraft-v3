import { describe, expect, it } from "vitest";
import type { AnalysisDetail, ToolResult } from "../../api/types";
import detailFixture from "../../test/fixtures/analysis-unterverteilung.json";
import { buildPrintHtml, buildShareText } from "./report";

const detail = detailFixture as unknown as AnalysisDetail;
const tool = {
  tool_id: "kundenbericht",
  label: "Kundenbericht",
  trade: "elektriker",
  analysis_id: detail.id,
  basis: "analysis",
  text: "**Kurz:** Alles erklärt <img src=x onerror=alert(1)>",
  materials: null,
  safety: { hazards: ["electrical"], qualified_person_required: true, notices: [], disclaimer: "ohne Gewähr" },
  source: { provider_id: "mock", model_id: "m", is_test_data: true },
  policy: { version: "1.4.0", interventions: [] },
  prompt_version: "1.0.0",
} as unknown as ToolResult;

const input = {
  result: detail.result,
  createdAt: detail.created_at,
  note: "FI <löst> aus",
  tradeLabel: "Elektriker",
  tools: [tool],
};

describe("Bericht zum Teilen und Drucken", () => {
  it("enthält im Text immer Sicherheitsblock, Testdaten-Hinweis und Haftungshinweis", () => {
    const text = buildShareText(input);
    expect(text).toContain("TESTDATEN");
    expect(text).toContain("Risiko: hoch");
    expect(text).toContain("Fachkraft erforderlich");
    expect(text).toContain(detail.result.safety.disclaimer);
    expect(text).toContain("1. ");
    expect(text).toContain("Kundenbericht:\nKurz: Alles erklärt");
    expect(text).toContain("(Ausführung nur durch eine Fachkraft.)");
  });

  it("escaped alles im PDF-Bericht und zeigt die Sicherheit vor der Diagnose", () => {
    const html = buildPrintHtml(input, ["https://example.test/a.jpg"]);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&#60;img src=x");
    expect(html).toContain("FI &#60;löst&#62; aus");
    expect(html).toContain("<strong>Kurz:</strong>");
    expect(html.indexOf("<h2>Sicherheit</h2>")).toBeLessThan(html.indexOf("<h2>Diagnose</h2>"));
    expect(html).toContain('<img src="https://example.test/a.jpg" alt="Foto 1">');
    expect(html).toContain("TESTDATEN");
  });
});
