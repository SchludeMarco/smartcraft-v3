import { Link, Route, Routes } from "react-router";
import { TestModeBanner } from "../components/TestModeBanner";
import { ProjectPage } from "../features/projects/ProjectPage";
import { ProjectsPage } from "../features/projects/ProjectsPage";

export function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="flex items-center justify-between bg-stone-900 px-4 py-3 text-white">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Sm@rtCraft
        </Link>
        <span className="text-xs text-stone-400">Der Kollege in der Hosentasche</span>
      </header>
      <TestModeBanner />
      <main className="flex-1 px-4 py-5">
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <Link to="/" className="text-amber-700 underline">
        Zur Projektübersicht
      </Link>
    </div>
  );
}
