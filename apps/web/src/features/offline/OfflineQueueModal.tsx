import { Trash2, WifiOff, X } from "lucide-react";
import { TradeChip } from "../../components/TradeChip";
import { formatDateTime } from "../../lib/format";
import { removeQueued } from "../../lib/offlineQueue";
import { useOffline } from "./OfflineContext";

/** Wartende Offline-Analysen ansehen und verwerfen (wie V2 OfflineQueueModal). */
export function OfflineQueueModal({ onClose }: { onClose: () => void }) {
  const { pending } = useOffline();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Wartende Analysen"
    >
      <div className="panel-parchment w-full max-w-md space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-gray-800">
            <WifiOff className="h-5 w-5 text-(--accent)" aria-hidden="true" />
            Warten auf Verbindung
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {pending.length === 0 && (
          <p className="text-sm text-gray-600">Keine wartenden Analysen.</p>
        )}
        <ul className="space-y-2">
          {pending.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-inner"
            >
              <div className="grow">
                <TradeChip trade={entry.trade} />
                <p className="mt-1 line-clamp-2 text-sm text-gray-800">
                  {entry.note || "(ohne Beschreibung)"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(entry.createdAt)} · {entry.photos.length}{" "}
                  Foto(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeQueued(entry.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700"
                aria-label="Wartende Analyse verwerfen"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-gray-500">
          Sobald wieder Empfang da ist, werden sie automatisch analysiert.
        </p>
      </div>
    </div>
  );
}
