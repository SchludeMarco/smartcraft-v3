import type { AnalysisResult } from "../../api/types";
import { RiskBadge } from "../../components/RiskBadge";
import { HAZARD_LABELS } from "./labels";

/** Sicherheitsblock – steht immer an erster Stelle und ist nicht ausblendbar. */
export function SafetyPanel({ result }: { result: AnalysisResult }) {
  const { safety, source } = result;
  return (
    <section
      aria-label="Sicherheit"
      className="space-y-3 rounded-lg border-2 border-red-700 bg-red-50 p-4"
    >
      {source.is_test_data && (
        <p className="rounded bg-amber-300 px-3 py-2 text-sm font-bold text-amber-950">
          TESTDATEN – das Foto wurde nicht ausgewertet. Nicht für Entscheidungen verwenden.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={safety.risk_level} />
        {safety.qualified_person_required && (
          <span className="rounded bg-red-700 px-2 py-0.5 text-xs font-semibold text-white">
            Prüfung durch Fachkraft erforderlich
          </span>
        )}
        {safety.hazards.map((hazard) => (
          <span key={hazard} className="rounded bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-900">
            {HAZARD_LABELS[hazard]}
          </span>
        ))}
      </div>
      {safety.notices.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-red-950">
          {safety.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-stone-700">{safety.disclaimer}</p>
    </section>
  );
}
