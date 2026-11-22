import type { AnalysisResult, ToolResult } from "../../api/types";
import { HAZARD_LABELS } from "../analysis/labels";

/**
 * Bericht für PDF-Export und Teilen (wie V2), aus einem gespeicherten Ergebnis.
 * Der Sicherheitsblock (Risiko, Fachkraft-Pflicht, Hinweise, Haftungshinweis) ist immer dabei.
 */
export type ReportInput = {
  result: AnalysisResult;
  createdAt: string;
  note: string | null;
  tradeLabel: string;
  tools: ToolResult[];
};

const RISK = { low: "niedrig", medium: "mittel", high: "hoch" } as const;

function date(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[*•]\s+/gm, "- ");
}

function safetyLines(result: AnalysisResult): string[] {
  const s = result.safety;
  const lines = [`Risiko: ${RISK[s.risk_level]}`];
  if (s.qualified_person_required) lines.push("Prüfung/Ausführung durch Fachkraft erforderlich.");
  if (s.hazards.length) lines.push(`Gefahren: ${s.hazards.map((h) => HAZARD_LABELS[h]).join(", ")}`);
  return [...lines, ...s.notices];
}

function toolText(tool: ToolResult): string {
  const body = tool.materials
    ? tool.materials.map((m) => `- ${m.item} (${m.quantity}) – ${m.category}`).join("\n")
    : stripMd(tool.text ?? "");
  const warn = tool.safety.qualified_person_required ? "\n(Ausführung nur durch eine Fachkraft.)" : "";
  return `${tool.label}:\n${body}${warn}`;
}

/** Reiner Text für WhatsApp, Telegram, E-Mail (wie V2 `shareText`). */
export function buildShareText({ result, createdAt, note, tradeLabel, tools }: ReportInput): string {
  const parts = [`Sm@rtCraft Analyse (${date(createdAt)}) – ${tradeLabel}`];
  if (result.source.is_test_data) parts.push("TESTDATEN – nicht für Entscheidungen verwenden.");
  if (note) parts.push(`Problembeschreibung: ${note}`);
  parts.push(`\nSicherheit:\n${safetyLines(result).join("\n")}`);
  if (result.diagnosis) parts.push(`\nDiagnose:\n${result.diagnosis}`);
  parts.push(`\nBefund:\n${result.summary}`);
  if (result.solution_steps.length)
    parts.push(`\nLösung:\n${result.solution_steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  const open = result.next_checks.map((c) => `- ${c.action}${c.requires_qualified_person ? " (Fachkraft)" : ""}`);
  if (open.length) parts.push(`\nNächste Prüfschritte:\n${open.join("\n")}`);
  for (const tool of tools) parts.push(`\n${toolText(tool)}`);
  parts.push(`\n${result.safety.disclaimer}`);
  return parts.join("\n");
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Markdown → HTML, nachdem alles escaped ist (keine Modell-HTML-Tags im Bericht). */
function mdHtml(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,6}\s+(.*)$/gm, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

/** Druckfertige HTML-Seite für „Als PDF exportieren“ (wie V2: Drucken → als PDF sichern). */
export function buildPrintHtml(input: ReportInput, imageUrls: string[]): string {
  const { result, createdAt, note, tradeLabel, tools } = input;
  const s = result.safety;
  const section = (title: string, body: string) => (body ? `<h2>${esc(title)}</h2>${body}` : "");
  const list = (items: string[], ordered = false) =>
    items.length
      ? `<${ordered ? "ol" : "ul"}>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`
      : "";
  const toolsHtml = tools
    .map((t) => {
      const body = t.materials
        ? `<table><thead><tr><th>Kategorie</th><th>Artikel</th><th>Menge</th></tr></thead><tbody>${t.materials
            .map((m) => `<tr><td>${esc(m.category)}</td><td>${esc(m.item)}</td><td>${esc(m.quantity)}</td></tr>`)
            .join("")}</tbody></table>`
        : `<div class="box">${mdHtml(t.text ?? "")}</div>`;
      const warn = t.safety.qualified_person_required
        ? `<p class="warn">Ausführung nur durch eine qualifizierte Fachkraft.</p>`
        : "";
      return `<h3>${esc(t.label)}</h3>${warn}${body}`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sm@rtCraft Bericht – ${esc(date(createdAt))}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:32px;color:#333;line-height:1.55}
h1{color:#3f3a8f;border-bottom:4px solid #2f6b4f;padding-bottom:8px}
h2{color:#2f6b4f;font-size:1.15em;border-left:5px solid #2f6b4f;padding-left:10px;margin-top:24px}
h3{font-size:1em;margin:16px 0 6px}
.meta{color:#666;font-size:.9em;margin:2px 0}
.safety{border:2px solid #dc2626;border-left-width:8px;background:#fef2f2;padding:10px 14px;border-radius:6px}
.test{background:#fef3c7;border:2px solid #d97706;padding:8px 12px;font-weight:bold;border-radius:6px}
.warn{color:#b91c1c;font-weight:bold}
.box{background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;border-radius:6px}
table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}
img{max-width:48%;margin:4px;border:1px solid #ccc;border-radius:6px}
.disclaimer{margin-top:28px;font-size:.8em;color:#666;border-top:1px solid #ddd;padding-top:8px}
</style></head><body>
<h1>Sm@rtCraft Bericht</h1>
<p class="meta"><strong>Datum:</strong> ${esc(date(createdAt))}</p>
<p class="meta"><strong>Beruf:</strong> ${esc(tradeLabel)}</p>
${note ? `<p class="meta"><strong>Problembeschreibung:</strong> ${esc(note)}</p>` : ""}
${result.source.is_test_data ? `<p class="test">TESTDATEN – Beispielergebnis der Mock-KI, nicht für Entscheidungen verwenden.</p>` : ""}
<h2>Sicherheit</h2><div class="safety">${list(safetyLines(result))}<p>${esc(s.disclaimer)}</p></div>
${section("Diagnose", result.diagnosis ? `<p>${esc(result.diagnosis)}</p>` : "")}
${section("Befund", `<p>${esc(result.summary)}</p>`)}
${section("Schrittweise Lösung", list(result.solution_steps, true))}
${section("Nächste Prüfschritte", list(result.next_checks.map((c) => `${c.action}${c.requires_qualified_person ? " (Fachkraft)" : ""}`)))}
${section("Unsicherheiten", list(result.uncertainties))}
${section("Fotos", imageUrls.map((u, i) => `<img src="${esc(u)}" alt="Foto ${i + 1}">`).join(""))}
${section("KI-Werkzeuge", toolsHtml)}
<p class="disclaimer">${esc(s.disclaimer)} Erstellt mit Sm@rtCraft 3.0 · Quelle: ${esc(result.source.provider_id)} / ${esc(result.source.model_id)} · Sicherheitsprüfung ${esc(result.policy.version)}</p>
</body></html>`;
}

/** Öffnet den Bericht in einem neuen Fenster und startet den Druckdialog (wie V2). */
export function openPrintWindow(html: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Bilder erst laden lassen, dann drucken
  win.setTimeout(() => win.print(), 600);
  return true;
}
