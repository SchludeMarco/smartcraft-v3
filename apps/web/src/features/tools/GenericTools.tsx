import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { AnalysisDetail, ToolResult } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useRunTool, useTools } from "./api";
import { GENERIC_TOOL_COLORS, ToolIcon } from "./icons";
import { ToolResultCard } from "./ToolResultCard";

/** V2 „Zusätzliche KI-Tools“ auf Basis der Diagnose (Materialliste, Sicherheits-Check, …). */
export function GenericTools({ detail }: { detail: AnalysisDetail }) {
  const tools = useTools();
  const run = useRunTool();
  const [results, setResults] = useState<Record<string, ToolResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const generic = tools.data?.filter((t) => t.requires_analysis) ?? [];
  if (generic.length === 0) return null;

  function call(toolId: string) {
    setLoading((l) => ({ ...l, [toolId]: true }));
    run.mutate(
      { toolId, trade: detail.result.trade, analysisId: detail.id },
      {
        onSuccess: (r) => setResults((all) => ({ ...all, [toolId]: r })),
        onSettled: () => setLoading((l) => ({ ...l, [toolId]: false })),
      },
    );
  }

  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      <h3 className="text-lg font-semibold text-gray-700">Zusätzliche KI-Tools:</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {generic.map((tool) => {
          const busy = Boolean(loading[tool.id]);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => call(tool.id)}
              disabled={busy}
              style={{ backgroundColor: GENERIC_TOOL_COLORS[tool.id] }}
              className="flex transform flex-col items-center justify-center rounded-xl p-2 text-xs font-bold text-white shadow-md transition duration-300 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ToolIcon toolId={tool.id} className="h-4 w-4" />}
              <span className="mt-1">✨ {tool.label}</span>
            </button>
          );
        })}
      </div>
      {run.isError && <ErrorMessage error={run.error} />}
      {generic
        .filter((t) => results[t.id])
        .map((t) => (
          <ToolResultCard
            key={t.id}
            result={results[t.id] as ToolResult}
            color={GENERIC_TOOL_COLORS[t.id]}
            onClose={() =>
              setResults((all) => Object.fromEntries(Object.entries(all).filter(([id]) => id !== t.id)))
            }
          />
        ))}
    </div>
  );
}
