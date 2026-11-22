import { AlertTriangle, X } from "lucide-react";
import type { MaterialItem, ToolResult } from "../../api/types";
import { Markdown } from "../../components/Markdown";
import { TRADE_THEMES } from "../../lib/trades";
import { ToolIcon } from "./icons";

function MaterialTable({ items }: { items: MaterialItem[] }) {
  const groups = new Map<string, MaterialItem[]>();
  for (const item of items)
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([category, list]) => (
        <div key={category}>
          <p className="mb-1 font-bold text-gray-800">{category}</p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {list.map((m, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
                <span>{m.item}</span>
                <span className="shrink-0 font-semibold text-gray-600">
                  {m.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Ergebnis-Box wie V2 (weiß, Icon, roter Schließen-Knopf) – mit Pflicht-Sicherheitshinweisen. */
export function ToolResultCard({
  result,
  color,
  tradeLabel,
  onClose,
}: {
  result: ToolResult;
  color?: string;
  /** Herkunfts-Beruf wie V2, wenn er vom aktuell gewählten abweicht */
  tradeLabel?: string;
  /** Ohne onClose (z. B. lokal gespeichert) gibt es keinen Schließen-Knopf */
  onClose?: () => void;
}) {
  const accent = color ?? TRADE_THEMES[result.trade].accent;
  const { safety } = result;
  return (
    <section
      aria-label={result.label}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-inner"
    >
      <div className="mb-3 flex items-start justify-between">
        <h4 className="flex items-center font-bold text-gray-800">
          <ToolIcon
            toolId={result.tool_id}
            className="mr-2 h-5 w-5 shrink-0"
            color={accent}
          />
          <span>
            {result.label}
            {tradeLabel && (
              <span className="block text-xs font-normal text-gray-400">
                {tradeLabel}
              </span>
            )}
          </span>
        </h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            title="Ergebnis entfernen"
            aria-label={`${result.label} entfernen`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {(safety.qualified_person_required || safety.notices.length > 0) && (
        <div className="mb-3 space-y-1 rounded-lg border-l-4 border-red-500 bg-red-50 p-2.5 text-xs text-red-800">
          {safety.qualified_person_required && (
            <p className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Ausführung nur durch eine qualifizierte Fachkraft.
            </p>
          )}
          {safety.notices.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}
      <div className="text-sm leading-relaxed text-gray-700">
        {result.materials ? (
          <MaterialTable items={result.materials} />
        ) : (
          <Markdown text={result.text ?? ""} />
        )}
      </div>
      <p className="mt-3 text-[11px] text-gray-400">{safety.disclaimer}</p>
    </section>
  );
}
