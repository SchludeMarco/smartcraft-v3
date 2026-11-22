import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCurrentTrade } from "../../lib/currentTrade";
import { useTrades } from "../analysis/api";
import { useOffline } from "./OfflineContext";
import { OFFLINE_QUICK_HELP } from "./quickHelp";

/** Hinweise wie V2: „Kein Empfang“, Nachholen läuft, Nachholen erledigt. */
export function OfflineBanners({
  onOpenHistory,
}: {
  onOpenHistory: () => void;
}) {
  const { online, pending, syncing, feedback, dismissFeedback } = useOffline();
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      {!online && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-amber-800 shadow-md"
        >
          <AlertTriangle
            className="mt-1 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div className="grow">
            <p className="font-bold">Kein Empfang</p>
            <p className="text-xs">
              Sie sind offline. Eine neue Analyse wird jetzt gespeichert und
              automatisch durchgeführt, sobald wieder eine Verbindung besteht
              {pending.length > 0 ? ` (${pending.length} warten bereits)` : ""}.
            </p>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="mt-2 text-xs font-semibold text-amber-900 underline hover:text-amber-700"
            >
              Sofort-Checkliste ohne Internet ansehen
            </button>
          </div>
        </div>
      )}
      {online && syncing && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border-l-4 border-blue-400 bg-blue-50 p-3 text-blue-800 shadow-md"
        >
          <Loader2
            className="h-5 w-5 shrink-0 animate-spin text-blue-500"
            aria-hidden="true"
          />
          <p className="text-xs">
            Gespeicherte Offline-Analyse(n) werden gerade nachgeholt…
          </p>
        </div>
      )}
      {feedback && (
        <div className="flex items-start gap-3 rounded-xl border-l-4 border-green-400 bg-green-50 p-3 text-green-800 shadow-md">
          <CheckCircle
            className="mt-1 h-5 w-5 shrink-0 text-green-500"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={onOpenHistory}
            className="grow text-left text-xs hover:underline"
          >
            {feedback}
          </button>
          <button
            type="button"
            onClick={dismissFeedback}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
            aria-label="Hinweis ausblenden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {showHelp && <QuickHelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

/** Offline-Kurzhilfe aus V2 – komplett ohne Verbindung nutzbar. */
export function QuickHelpModal({ onClose }: { onClose: () => void }) {
  const { trade } = useCurrentTrade();
  const trades = useTrades();
  const data = OFFLINE_QUICK_HELP[trade];
  const label = trades.data?.find((t) => t.id === trade)?.label ?? "Ihr Beruf";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Offline-Kurzhilfe"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between border-b pb-3">
          <h3 className="flex items-center text-xl font-bold text-gray-800">
            <WifiOff
              className="mr-2 h-5 w-5 text-(--accent)"
              aria-hidden="true"
            />
            Offline-Kurzhilfe: {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Fest hinterlegte Checkliste für die häufigsten Fälle — funktioniert
          komplett ohne Verbindung. Ersetzt keine KI-Diagnose, hilft aber, bis
          wieder Empfang da ist.
        </p>
        <div className="space-y-4">
          {data.items.map((item) => (
            <div key={item.title} className="rounded-xl bg-(--accent-soft) p-3">
              <p className="mb-1.5 text-sm font-bold text-(--accent-dark)">
                {item.title}
              </p>
              <ul className="space-y-1">
                {item.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start text-xs text-gray-700"
                  >
                    <span className="mt-0.5 mr-1.5 text-(--accent)">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg border-l-4 border-red-400 bg-red-50 p-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
            aria-hidden="true"
          />
          <p className="text-xs text-red-700">{data.safety}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-accent mt-4 shrink-0 px-4 py-2.5 text-sm"
        >
          Schließen
        </button>
      </div>
    </div>
  );
}
