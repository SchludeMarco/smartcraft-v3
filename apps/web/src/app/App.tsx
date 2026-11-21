import { Link, Route, Routes } from "react-router";
import { Header } from "../components/Header";
import { StorageHint, TestModeBanner } from "../components/TestModeBanner";
import { AnalysisPage } from "../features/analysis/AnalysisPage";
import { NewAnalysisPage } from "../features/analysis/NewAnalysisPage";
import { ProjectPage } from "../features/projects/ProjectPage";
import { ProjectsPage } from "../features/projects/ProjectsPage";
import { ReportPage } from "../features/report/ReportPage";

export function App() {
  return (
    <div className="app-backdrop flex min-h-dvh justify-center p-3 sm:p-6 print:block print:p-0">
      <div className="flex w-full max-w-sm flex-col sm:max-w-xl md:max-w-2xl lg:max-w-3xl print:max-w-none">
        <Header />
        <main className="surface-panel flex-1 space-y-6 rounded-b-2xl p-4 text-slate-900 sm:p-6 print:rounded-none print:border-0 print:p-0">
          <TestModeBanner />
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="/projects/:projectId/analyses/new" element={<NewAnalysisPage />} />
            <Route path="/projects/:projectId/report" element={<ReportPage />} />
            <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="space-y-1 py-3 text-center text-xs text-white/60 print:hidden">
          <p>KI-gestützte Ersteinschätzung – keine Sicherheitsfreigabe.</p>
          <StorageHint />
        </footer>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">Seite nicht gefunden</h1>
      <Link to="/" className="font-semibold text-brand underline">
        Zur Projektübersicht
      </Link>
    </div>
  );
}
