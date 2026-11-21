import { Link, useParams } from "react-router";
import { ErrorMessage } from "../../components/ErrorMessage";
import { RiskBadge } from "../../components/RiskBadge";
import { formatDateTime } from "../../lib/format";
import { useProject, useProjectAnalyses } from "./api";
import { NotesSection } from "./NotesSection";

export function ProjectPage() {
  const { projectId = "" } = useParams();
  const project = useProject(projectId);
  const analyses = useProjectAnalyses(projectId);

  if (project.isPending) return <p className="text-stone-500">Lade Projekt …</p>;
  if (project.isError) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={project.error} />
        <Link to="/" className="text-amber-700 underline">
          Zur Projektübersicht
        </Link>
      </div>
    );
  }

  const p = project.data;
  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm text-amber-700">
        ← Alle Projekte
      </Link>
      <section className="space-y-1">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.address && <p className="text-stone-700">{p.address}</p>}
        {p.client && <p className="text-sm text-stone-600">Auftraggeber: {p.client}</p>}
        {p.description && <p className="text-sm whitespace-pre-line text-stone-600">{p.description}</p>}
        <Link to={`/projects/${p.id}/report`} className="inline-block pt-1 text-sm text-amber-700 underline">
          Projektbericht ansehen / drucken
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Analysen</h2>
        <Link
          to={`/projects/${p.id}/analyses/new`}
          className="block rounded bg-amber-600 px-4 py-3 text-center font-semibold text-white"
        >
          Neue Analyse per Foto
        </Link>
        {analyses.isError && <ErrorMessage error={analyses.error} />}
        {analyses.data?.length === 0 && <p className="text-stone-600">Noch keine Analysen.</p>}
        <ul className="space-y-2">
          {analyses.data?.map((a) => (
            <li key={a.id}>
              <Link
                to={`/analyses/${a.id}`}
                className="block rounded-lg bg-white p-3 shadow-sm hover:ring-2 hover:ring-amber-500"
              >
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="mt-1 text-sm text-stone-600">
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
