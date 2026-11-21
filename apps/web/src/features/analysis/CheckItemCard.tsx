import { useState, type FormEvent } from "react";
import type { AnalysisResult, CheckItem } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { formatDateTime } from "../../lib/format";
import { NAME_KEY, loadValue, saveValue } from "../../lib/storage";
import { useUpdateCheck } from "./api";

const STATUS_LABELS: Record<CheckItem["status"], string> = {
  open: "offen",
  done: "erledigt",
  not_applicable: "nicht zutreffend",
};

const STATUS_STYLES: Record<CheckItem["status"], string> = {
  open: "bg-stone-200 text-stone-700",
  done: "bg-green-700 text-white",
  not_applicable: "bg-stone-500 text-white",
};

type Mode = "done" | "not_applicable" | null;

/**
 * Prüfschritt mit Dokumentation durch den Menschen.
 * Abhaken ändert nicht das KI-Ergebnis – die Regeln prüft das Backend.
 */
export function CheckItemCard({
  analysisId,
  check,
  result,
}: {
  analysisId: string;
  check: CheckItem;
  result: AnalysisResult;
}) {
  const update = useUpdateCheck(analysisId);
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState(() => loadValue(NAME_KEY));
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mode) return;
    saveValue(NAME_KEY, name.trim());
    update.mutate(
      {
        checkId: check.id,
        update: {
          status: mode,
          completed_by: name,
          comment: comment || null,
          qualified_person_confirmed: check.requires_qualified_person ? confirmed : null,
        },
      },
      {
        onSuccess: () => {
          setMode(null);
          setComment("");
          setConfirmed(false);
        },
      },
    );
  }

  function reopen() {
    update.mutate({ checkId: check.id, update: { status: "open" } });
  }

  return (
    <li className="rounded-lg bg-white p-3 shadow-sm" data-testid={`check-${check.position}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-stone-500">{check.position + 1}.</span>
        {check.requires_qualified_person && (
          <span className="rounded bg-red-700 px-1.5 font-semibold text-white">Nur Fachkraft</span>
        )}
        {check.source === "policy" && (
          <span className="rounded bg-stone-800 px-1.5 font-semibold text-white">
            Pflicht (Sicherheitsprüfung)
          </span>
        )}
        {check.reference && <span className="text-stone-600">{check.reference}</span>}
        <span className={`ml-auto rounded px-1.5 font-semibold ${STATUS_STYLES[check.status]}`}>
          {STATUS_LABELS[check.status]}
        </span>
      </div>
      <p className="mt-1 font-medium">{check.action}</p>
      <p className="text-sm text-stone-600">{check.reason}</p>
      {check.component_indices.length > 0 && (
        <p className="mt-1 text-xs text-stone-500">
          An:{" "}
          {check.component_indices
            .map((i) => `${i + 1}. ${result.components[i]?.name ?? "?"}`)
            .join(", ")}
        </p>
      )}

      {check.status !== "open" && (
        <div className="mt-2 rounded bg-stone-50 p-2 text-sm">
          <p>
            Dokumentiert von <strong>{check.completed_by}</strong>
            {check.completed_at && <> am {formatDateTime(check.completed_at)}</>}
          </p>
          {check.qualified_person_confirmed && (
            <p className="text-green-800">Ausführung durch Fachkraft bestätigt</p>
          )}
          {check.comment && <p className="text-stone-600">„{check.comment}“</p>}
          <button
            type="button"
            onClick={reopen}
            disabled={update.isPending}
            className="mt-1 text-xs text-amber-700 underline print:hidden"
          >
            Wieder öffnen
          </button>
        </div>
      )}

      {check.status === "open" && mode === null && (
        <div className="mt-2 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setMode("done")}
            className="rounded bg-green-700 px-3 py-2 text-sm font-semibold text-white"
          >
            Erledigt
          </button>
          <button
            type="button"
            onClick={() => setMode("not_applicable")}
            className="rounded border border-stone-400 px-3 py-2 text-sm"
          >
            Nicht zutreffend
          </button>
        </div>
      )}

      {mode !== null && (
        <form onSubmit={submit} className="mt-2 space-y-2 rounded bg-stone-50 p-2 print:hidden">
          <label className="block text-sm">
            <span className="font-medium">Dein Name *</span>
            <input
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">
              {mode === "not_applicable" ? "Begründung *" : "Kommentar (optional)"}
            </span>
            <textarea
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
            />
          </label>
          {mode === "done" && check.requires_qualified_person && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                Ich bestätige, dass dieser Schritt von einer qualifizierten Fachkraft ausgeführt wurde.
              </span>
            </label>
          )}
          {update.isError && <ErrorMessage error={update.error} />}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                update.reset();
              }}
              className="rounded border border-stone-300 px-3 py-2 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
