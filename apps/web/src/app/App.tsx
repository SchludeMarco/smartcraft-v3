import { useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router";
import { Header } from "../components/Header";
import { StorageHint, TestModeBanner } from "../components/TestModeBanner";
import { APP_VERSION } from "../features/changelog/changelog";
import { ChangelogPage } from "../features/changelog/ChangelogPage";
import { AnalysisPage } from "../features/analysis/AnalysisPage";
import { HomePage } from "../features/analysis/HomePage";
import { HistoryModal } from "../features/history/HistoryModal";
import { LocalAnalysisPage } from "../features/history/LocalAnalysisPage";
import { OfflineBanners } from "../features/offline/OfflineBanners";
import { OfflineProvider } from "../features/offline/OfflineContext";
import { ProjectPage } from "../features/projects/ProjectPage";
import { ProjectsPage } from "../features/projects/ProjectsPage";
import { ReportPage } from "../features/report/ReportPage";
import { CurrentTradeProvider, useCurrentTrade } from "../lib/currentTrade";
import { tradeStyle } from "../lib/trades";

export function App() {
  return (
    <CurrentTradeProvider>
      <OfflineProvider>
        <Shell />
      </OfflineProvider>
    </CurrentTradeProvider>
  );
}

/** Aufbau wie V2: dunkler Hintergrund, Kopfleiste, Pergament-Hauptfenster, Fußzeile. */
function Shell() {
  const { trade } = useCurrentTrade();
  const [showHistory, setShowHistory] = useState(false);
  return (
    <div
      className="app-backdrop relative flex min-h-dvh justify-center p-4 sm:p-6 lg:p-8 print:block print:p-0"
      style={tradeStyle(trade)}
    >
      <div
        id="app-shell"
        className="relative z-10 flex w-full max-w-sm flex-col items-center sm:max-w-xl md:max-w-2xl lg:max-w-3xl print:max-w-none"
      >
        <Header onHistory={() => setShowHistory(true)} />
        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
        <main className="panel-parchment w-full space-y-6 p-4 sm:p-6 lg:p-8 print:border-0 print:p-0 print:shadow-none">
          <OfflineBanners onOpenHistory={() => setShowHistory(true)} />
          <TestModeBanner />
          <Routes>
            <Route path="/" element={<ProjectsPage />} />
            <Route path="/analyse" element={<HomePage />} />
            <Route path="/projects" element={<Navigate to="/" replace />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="/projects/:projectId/report" element={<ReportPage />} />
            <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            <Route path="/lokal/:localId" element={<LocalAnalysisPage />} />
            <Route path="/aenderungen" element={<ChangelogPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="w-full space-y-1 py-3 text-center text-[11px] text-white/60 print:hidden">
          <p>KI-gestützte Ersteinschätzung – keine Sicherheitsfreigabe.</p>
          <StorageHint />
          <p>
            <Link to="/aenderungen" className="underline hover:text-white">
              Änderungsprotokoll · Version {APP_VERSION}
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">Seite nicht gefunden</h1>
      <Link to="/" className="font-semibold text-(--accent) underline">
        Zur Startseite
      </Link>
    </div>
  );
}
