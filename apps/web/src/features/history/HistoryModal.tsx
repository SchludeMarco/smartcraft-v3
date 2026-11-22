import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, HardDrive, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ErrorMessage } from "../../components/ErrorMessage";
import { RiskBadge } from "../../components/RiskBadge";
import { TradeChip } from "../../components/TradeChip";
import { formatDateTime } from "../../lib/format";
import { deleteLocalAnalysis, listLocalAnalyses } from "../../lib/localAnalyses";
import { TRADE_THEMES } from "../../lib/trades";
import { useRecentAnalyses } from "../analysis/api";

type Tab = "server" | "lokal";

/** Verlauf wie V2: Reiter für gespeicherte Analysen (Server) und lokal gesicherte (Gerät). */
export function HistoryModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("server");
  const recent = useRecentAnalyses(tab === "server");
  const queryClient = useQueryClient();
  const local = useQuery({
    queryKey: ["local-analyses"],
    queryFn: listLocalAnalyses,
    enabled: tab === "lokal",
  });

  async function remove(id: string) {
    await deleteLocalAnalysis(id);
    await queryClient.invalidateQueries({ queryKey: ["local-analyses"] });
  }

  const tabClass = (t: Tab) =>
    `flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors ${
      tab === t ? "bg-(--accent) text-white" : "bg-white text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Verlauf">
      <div className="panel-parchment mt-8 w-full max-w-md space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2>
            <span className="badge-pill">Verlauf</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
            aria-label="Verlauf schließen"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-gray-300" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "server"} className={tabClass("server")} onClick={() => setTab("server")}>
            <Cloud className="h-4 w-4" aria-hidden="true" />
            Gespeichert
          </button>
          <button type="button" role="tab" aria-selected={tab === "lokal"} className={`${tabClass("lokal")} border-l border-gray-300`} onClick={() => setTab("lokal")}>
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            Lokal
          </button>
        </div>

        {tab === "server" && (
          <div className="space-y-2">
            {recent.isPending && <Loader2 className="mx-auto h-6 w-6 animate-spin text-(--accent)" aria-label="Lädt" />}
            {recent.isError && <ErrorMessage error={recent.error} />}
            {recent.data?.length === 0 && <p className="text-sm text-gray-600">Noch keine Analysen.</p>}
            <ul className="space-y-2">
              {recent.data?.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/analyses/${a.id}`}
                    onClick={onClose}
                    className="block rounded-xl border border-l-4 border-gray-200 bg-white p-3 shadow-inner hover:bg-gray-50"
                    style={{ borderLeftColor: TRADE_THEMES[a.trade].accent }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <TradeChip trade={a.trade} />
                      <RiskBadge level={a.risk_level} />
                      {a.is_test_data && (
                        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">Testdaten</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-800">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(a.created_at)} · {a.capture_count} Foto(s)
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-500">
              Im Demo-Betrieb kann der Server-Verlauf verschwinden – „Lokal speichern“ sichert eine
              Analyse dauerhaft auf diesem Gerät.
            </p>
          </div>
        )}

        {tab === "lokal" && (
          <div className="space-y-2">
            {local.isPending && <Loader2 className="mx-auto h-6 w-6 animate-spin text-(--accent)" aria-label="Lädt" />}
            {local.isError && <ErrorMessage error={local.error} />}
            {local.data?.length === 0 && (
              <p className="text-sm text-gray-600">Noch nichts lokal gespeichert.</p>
            )}
            <ul className="space-y-2">
              {local.data?.map((entry) => (
                <li key={entry.id} className="flex items-stretch gap-2">
                  <Link
                    to={`/lokal/${entry.id}`}
                    onClick={onClose}
                    className="block flex-1 rounded-xl border border-l-4 border-gray-200 bg-white p-3 shadow-inner hover:bg-gray-50"
                    style={{ borderLeftColor: TRADE_THEMES[entry.detail.result.trade].accent }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <TradeChip trade={entry.detail.result.trade} />
                      <RiskBadge level={entry.detail.result.safety.risk_level} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-800">
                      {entry.detail.result.diagnosis || entry.detail.result.summary}
                    </p>
                    <p className="text-xs text-gray-500">
                      Gespeichert {formatDateTime(entry.savedAt)} · {entry.photos.length} Foto(s)
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(entry.id)}
                    className="flex w-10 items-center justify-center rounded-xl bg-red-600 text-white hover:bg-red-700"
                    aria-label="Lokale Analyse löschen"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
