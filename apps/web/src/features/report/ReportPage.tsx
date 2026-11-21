import { Link, useParams } from "react-router";
import type { AnalysisDetail, ProjectReport } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { RiskBadge } from "../../components/RiskBadge";
import { formatDateTime } from "../../lib/format";
import { captureImageUrl } from "../analysis/api";
import { CONFIDENCE_LABELS, SEVERITY_LABELS } from "../analysis/labels";
import { SafetyPanel } from "../analysis/SafetyPanel";
import { useProjectReport } from "../projects/api";

const STATUS_TEXT = { open: "offen", done: "erledigt", not_applicable: "nicht zutreffend" } as const;

/** Druckbarer Projektbericht. „Als PDF speichern“ über den Druckdialog des Browsers. */
export function ReportPage() {
  const { projectId = "" } = useParams();
  const report = useProjectReport(projectId);

  if (report.isPending) return <p className="text-stone-500">Bericht wird erstellt …</p>;
  if (report.isError) return <ErrorMessage error={report.error} />;

  const r = report.data;
  return (
    <article className="space-y-6 print:space-y-4 print:text-sm">
      <div className="flex items-center justify-between print:hidden">
        <Link to={`/projects/${projectId}`} className="text-sm text-amber-700">
          ← Zum Projekt
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-stone-900 px-4 py-2 font-semibold text-white"
        >
          Drucken / als PDF speichern
        </button>
      </div>

      <header className="space-y-1">
        <p className="text-xs tracking-wide text-stone-500 uppercase">Sm@rtCraft · Projektbericht</p>
        <h1 className="text-2xl font-bold">{r.project.name}</h1>
        {r.project.address && <p>{r.project.address}</p>}
        {r.project.client && <p className="text-sm">Auftraggeber: {r.project.client}</p>}
        <p className="text-xs text-stone-500">Erstellt am {formatDateTime(r.generated_at)}</p>
      </header>

      <p role="note" className="rounded border-2 border-stone-800 p-3 text-sm font-medium">
        {r.disclaimer}
      </p>

      <Summary report={r} />

      {r.project.description && (
        <section>
          <h2 className="text-lg font-semibold">Beschreibung</h2>
          <p className="whitespace-pre-line">{r.project.description}</p>
        </section>
      )}

      {r.analyses.map((analysis, i) => (
        <ReportAnalysis key={analysis.id} analysis={analysis} index={i + 1} />
      ))}

      {r.notes.length > 0 && (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-lg font-semibold">Notizen</h2>
          <ul className="space-y-1">
            {r.notes.map((n) => (
              <li key={n.id}>
                <span className="text-stone-500">
                  {formatDateTime(n.created_at)}
                  {n.author && ` · ${n.author}`}:
                </span>{" "}
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Summary({ report }: { report: ProjectReport }) {
  const s = report.summary;
  return (
    <section aria-label="Zusammenfassung" className="space-y-2 rounded-lg bg-white p-4 shadow-sm print:shadow-none">
      <h2 className="text-lg font-semibold">Zusammenfassung</h2>
      {s.contains_test_data && (
        <p className="rounded bg-amber-300 px-3 py-1 text-sm font-bold text-amber-950">
          Enthält TESTDATEN der Mock-KI – keine echte Bildauswertung.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {s.highest_risk && <RiskBadge level={s.highest_risk} />}
        {s.qualified_person_required && (
          <span className="rounded bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
            Prüfung durch Fachkraft erforderlich
          </span>
        )}
      </div>
      <ul className="text-sm">
        <li>Analysen: {s.analysis_count}</li>
        <li>
          Prüfschritte: {s.checks_total} gesamt · {s.checks_done} erledigt · {s.checks_not_applicable} nicht
          zutreffend · <strong>{s.checks_open} offen</strong>
        </li>
        {s.qualified_checks_open > 0 && (
          <li className="font-semibold text-red-800">
            Davon {s.qualified_checks_open} offene Prüfschritte, die nur eine Fachkraft ausführen darf.
          </li>
        )}
      </ul>
    </section>
  );
}

function ReportAnalysis({ analysis, index }: { analysis: AnalysisDetail; index: number }) {
  const result = analysis.result;
  return (
    <section className="space-y-3 border-t border-stone-300 pt-4 print:break-before-page">
      <h2 className="text-xl font-semibold">
        Analyse {index} · {formatDateTime(analysis.created_at)}
      </h2>
      <SafetyPanel result={result} />
      <p>{result.summary}</p>
      {analysis.note && <p className="text-sm">Notiz: {analysis.note}</p>}

      <div className="grid grid-cols-2 gap-2">
        {analysis.captures.map((c) => (
          <img
            key={c.id}
            src={captureImageUrl(analysis.id, c.id)}
            alt={`Analyse ${index}, Foto ${c.position + 1}`}
            className="w-full rounded"
          />
        ))}
      </div>

      {result.findings.length > 0 && (
        <div>
          <h3 className="font-semibold">Auffälligkeiten</h3>
          <ul className="list-disc pl-5 text-sm">
            {result.findings.map((f, i) => (
              <li key={i}>
                [{SEVERITY_LABELS[f.severity]}] {f.title} – {f.reasoning} ({CONFIDENCE_LABELS[f.confidence]})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-semibold">Prüfschritte</h3>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-400">
              <th className="py-1 pr-2">#</th>
              <th className="py-1 pr-2">Prüfschritt</th>
              <th className="py-1">Dokumentation</th>
            </tr>
          </thead>
          <tbody>
            {analysis.checks.map((c) => (
              <tr key={c.id} className="border-b border-stone-200 align-top">
                <td className="py-1 pr-2">{c.position + 1}</td>
                <td className="py-1 pr-2">
                  {c.action}
                  {c.requires_qualified_person && <strong> (nur Fachkraft)</strong>}
                  {c.reference && <span className="text-stone-500"> · {c.reference}</span>}
                </td>
                <td className="py-1">
                  <strong>{STATUS_TEXT[c.status]}</strong>
                  {c.completed_by && (
                    <>
                      <br />
                      {c.completed_by}
                      {c.completed_at && `, ${formatDateTime(c.completed_at)}`}
                    </>
                  )}
                  {c.qualified_person_confirmed && (
                    <>
                      <br />
                      Fachkraft bestätigt
                    </>
                  )}
                  {c.comment && (
                    <>
                      <br />„{c.comment}“
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-semibold">Unsicherheiten</h3>
        <ul className="list-disc pl-5 text-sm">
          {result.uncertainties.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
