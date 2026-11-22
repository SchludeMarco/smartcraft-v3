import { useState } from "react";
import { FolderPlus, Plus, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ErrorMessage } from "../../components/ErrorMessage";
import { formatDateTime } from "../../lib/format";
import { useProjects } from "./api";
import { ProjectForm } from "./ProjectForm";

/**
 * Startseite (Wunsch Marco, 22.11.2026): Projekt auswählen oder anlegen. Ohne Projekte ist das
 * Formular für das erste Projekt direkt offen. Die Schnellanalyse ohne Projekt bleibt möglich.
 */
export function ProjectsPage() {
  const projects = useProjects();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const none = projects.data?.length === 0;
  const formOpen = showForm || (none && !dismissed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1>
          <span className="badge-pill">Projekt auswählen</span>
        </h1>
        {!formOpen && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1 px-4 py-2 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Neues Projekt
          </button>
        )}
      </div>

      {formOpen && (
        <div className="space-y-2">
          {none && (
            <p className="flex items-center gap-2 text-sm text-gray-700">
              <FolderPlus className="h-4 w-4 text-(--accent)" aria-hidden="true" />
              Noch keine Projekte – leg dein erstes Projekt an (z. B. die Baustelle oder den Kunden).
            </p>
          )}
          <ProjectForm
            onCreated={(project) => navigate(`/projects/${project.id}`)}
            onCancel={() => {
              setShowForm(false);
              setDismissed(true);
            }}
          />
        </div>
      )}

      {projects.isPending && <p className="text-gray-500">Lade Projekte …</p>}
      {projects.isError && <ErrorMessage error={projects.error} />}

      <ul className="space-y-2">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.id}`}
              className="surface-card block rounded-xl border-l-4 border-l-(--accent) p-4 transition hover:ring-2 hover:ring-(--accent)"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-gray-800">{project.name}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {project.analysis_count} {project.analysis_count === 1 ? "Analyse" : "Analysen"}
                </span>
              </div>
              {project.address && <div className="text-sm text-gray-600">{project.address}</div>}
              <div className="mt-1 text-xs text-gray-400">Zuletzt geändert {formatDateTime(project.updated_at)}</div>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/analyse"
        className="btn-parchment flex items-center justify-center gap-2 py-3 text-sm"
      >
        <Zap className="h-4 w-4" aria-hidden="true" />
        Schnellanalyse ohne Projekt
      </Link>
    </div>
  );
}
