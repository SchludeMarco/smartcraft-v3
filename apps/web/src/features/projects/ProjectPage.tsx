import { Camera, FileText } from "lucide-react";
import { Link, useParams } from "react-router";
import { TRADE_THEMES } from "../../lib/trades";
import { ErrorMessage } from "../../components/ErrorMessage";
import { RiskBadge } from "../../components/RiskBadge";
import { TradeChip } from "../../components/TradeChip";
import { formatDateTime } from "../../lib/format";
import { useProject, useProjectAnalyses } from "./api";
import { NotesSection } from "./NotesSection";

export function ProjectPage() {
  const { projectId = "" } = useParams();
  const project = useProject(projectId);
  const analyses = useProjectAnalyses(projectId);

  if (project.isPending) return <p className="text-slate-500">Lade Projekt …</p>;
  if (project.isError) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={project.error} />
        <Link to="/projects" className="font-semibold text-brand underline">
          Zur Projektübersicht
        </Link>
      </div>
    );
  }

  const p = project.data;
  return (
    <div className="space-y-5">
      <Link to="/projects" className="text-sm font-semibold text-brand">
        ← Alle Projekte
      </Link>
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{p.name}</h1>
        {p.address && <p className="text-slate-700">{p.address}</p>}
        {p.client && <p className="text-sm text-slate-600">Auftraggeber: {p.client}</p>}
        {p.description && <p className="text-sm whitespace-pre-line text-slate-600">{p.description}</p>}
        <Link to={`/projects/${p.id}/report`} className="inline-flex items-center gap-1 pt-1 text-sm font-semibold text-brand underline">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Projektbericht ansehen / drucken
        </Link>
      </section>

      <section className="space-y-2">
        <h2>
          <span className="step-badge">Analysen</span>
        </h2>
        <Link
          to={`/?projekt=${encodeURIComponent(p.id)}`}
          className="btn-quest flex items-center justify-center gap-2 px-4 py-3"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Neue Analyse für dieses Projekt
        </Link>
        {analyses.isError && <ErrorMessage error={analyses.error} />}
        {analyses.data?.length === 0 && <p className="text-slate-600">Noch keine Analysen.</p>}
        <ul className="space-y-2">
          {analyses.data?.map((a) => (
            <li key={a.id}>
              <Link
                to={`/analyses/${a.id}`}
                className="surface-card block rounded-xl border-l-4 p-3 transition hover:ring-2 hover:ring-brand"
                style={{ borderLeftColor: TRADE_THEMES[a.trade].accent }}
              >
              <div className="flex flex-wrap items-center gap-2">
                <TradeChip trade={a.trade} />
                <RiskBadge level={a.risk_level} />
                {a.qualified_person_required && (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                    Fachkraft erforderlich
                  </span>
                )}
                {a.is_test_data && (
                  <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                    Testdaten
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {formatDateTime(a.created_at)} · {a.capture_count} Foto(s) · {a.open_check_count} offene
                Prüfschritte
              </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <NotesSection projectId={p.id} />
    </div>
  );
}
