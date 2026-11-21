import { useState } from "react";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ErrorMessage } from "../../components/ErrorMessage";
import { formatDateTime } from "../../lib/format";
import { useProjects } from "./api";
import { ProjectForm } from "./ProjectForm";

export function ProjectsPage() {
  const projects = useProjects();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-wood-dark">Projekte</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-quest flex items-center gap-1 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Neues Projekt
          </button>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onCreated={(project) => navigate(`/projects/${project.id}`)}
          onCancel={() => setShowForm(false)}
        />
      )}

      {projects.isPending && <p className="text-stone-500">Lade Projekte …</p>}
      {projects.isError && <ErrorMessage error={projects.error} />}
      {projects.data?.length === 0 && !showForm && (
        <p className="rounded-xl border-4 border-dashed border-parchment-dark p-6 text-center text-stone-600">
          Noch keine Projekte. Lege eines an, um Analysen einer Baustelle zu sammeln.
        </p>
      )}

      <ul className="space-y-2">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.id}`}
              className="card-parchment block rounded-xl border-l-4 border-l-steel p-4 transition hover:ring-2 hover:ring-steel"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display font-bold text-wood-dark">{project.name}</span>
                <span className="shrink-0 text-xs text-stone-500">
                  {project.analysis_count} {project.analysis_count === 1 ? "Analyse" : "Analysen"}
                </span>
              </div>
              {project.address && <div className="text-sm text-stone-600">{project.address}</div>}
              <div className="mt-1 text-xs text-stone-400">
                Zuletzt geändert {formatDateTime(project.updated_at)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
