import { useState } from "react";
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
        <h1 className="text-2xl font-bold">Projekte</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-amber-600 px-4 py-2 font-semibold text-white"
          >
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
        <p className="rounded-lg bg-white p-4 text-stone-600">
          Noch keine Projekte. Lege eines an, um Analysen einer Baustelle zu sammeln.
        </p>
      )}

      <ul className="space-y-2">
        {projects.data?.map((project) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.id}`}
              className="block rounded-lg bg-white p-4 shadow-sm hover:ring-2 hover:ring-amber-500"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{project.name}</span>
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
