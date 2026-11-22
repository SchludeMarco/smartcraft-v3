import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ToolResult, Trade } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useTrades } from "../analysis/api";
import { useRunTool, useTools } from "./api";
import { ToolIcon } from "./icons";
import { ToolResultCard } from "./ToolResultCard";

/**
 * Berufs-Spezial-Tools wie V2: sofort nach der Berufswahl nutzbar. Grundlage so konkret wie
 * möglich: Analyse > Beschreibung > nur der Beruf. Ergebnisse stapeln sich auch beim
 * Berufswechsel (wie V2).
 */
export function TradeTools({
  trade,
  analysisId,
  note,
}: {
  trade: Trade;
  analysisId: string | null;
  note: string;
}) {
  const tools = useTools();
  const trades = useTrades();
  const run = useRunTool();
  const [results, setResults] = useState<ToolResult[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const current = (tools.data ?? []).filter(
    (t) => t.trade !== null && (trade === "allround" || t.trade === trade),
  );
  if (current.length === 0) return null;
  const tradeLabel = (id: Trade) => trades.data?.find((t) => t.id === id)?.label.split(" (")[0] ?? id;

  function call(toolId: string, toolTrade: Trade) {
    setLoading((l) => ({ ...l, [toolId]: true }));
    run.mutate(
      { toolId, trade: toolTrade, analysisId, note },
      {
        onSuccess: (r) => setResults((all) => [r, ...all.filter((x) => x.tool_id !== r.tool_id)]),
        onSettled: () => setLoading((l) => ({ ...l, [toolId]: false })),
      },
    );
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3">
        <span className="badge-pill inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {trade === "allround" ? "Alle Berufs-Spezial-Tools" : `${tradeLabel(trade)}-Spezial-Tools`}
        </span>
      </h2>
      <div className="panel-parchment rounded-xl p-4">
        <p className="mb-3 text-xs text-gray-500">
          Direkt nutzbar, sobald ein Beruf gewählt ist — je genauer die Grundlage (Diagnose &gt;
          Problembeschreibung &gt; nur der Beruf), desto konkreter die Antwort.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {current.map((tool) => {
              const busy = Boolean(loading[tool.id]);
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => call(tool.id, tool.trade as Trade)}
                disabled={busy}
                className="flex transform flex-col items-center justify-center rounded-xl p-2 text-xs font-bold text-white shadow-md transition duration-300 active:scale-[0.98] disabled:opacity-60"
                style={{ backgroundColor: busy ? "var(--accent-dark)" : "var(--accent)" }}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ToolIcon toolId={tool.id} className="h-4 w-4" />}
                <span className="mt-1">✨ {tool.label}</span>
              </button>
            );
          })}
        </div>
        {run.isError && (
          <div className="mt-3">
            <ErrorMessage error={run.error} />
          </div>
        )}
        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r) => (
              <ToolResultCard
                key={r.tool_id}
                result={r}
                tradeLabel={r.trade !== trade ? tradeLabel(r.trade) : undefined}
                onClose={() => setResults((all) => all.filter((x) => x.tool_id !== r.tool_id))}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
