import { AlertTriangle, ClipboardList, FolderPlus, HardDrive, ListChecks, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { AnalysisDetail, OverlayAnchor, ToolResult } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { TradeChip } from "../../components/TradeChip";
import { formatDateTime } from "../../lib/format";
import { SPECIAL_SCOPE, useToolResults } from "../../lib/toolResultsStore";
import { ExportButtons, ShareButton, type PhotoSource } from "../export/ResultActions";
import { useProjects } from "../projects/api";
import { GenericTools } from "../tools/GenericTools";
import { ToolResultCard } from "../tools/ToolResultCard";
import { captureImageUrl, useAssignProject, useOverlay } from "./api";
import { CheckItemCard } from "./CheckItemCard";
import { CONFIDENCE_LABELS, SEVERITY_LABELS, SEVERITY_STYLES } from "./labels";
import { PhotoMarkers } from "./PhotoMarkers";
import { ReadAloud } from "./ReadAloud";
import { SafetyPanel } from "./SafetyPanel";

/**
 * Ergebnis wie V2 („Lösung und Diagnose“), ergänzt um den V3-Sicherheitsblock, die
 * Prüfschritte mit Dokumentation und die Bauteil-Markierungen im Foto.
 * Reine Anzeige – Sicherheitslogik liegt ausschließlich im Backend.
 */
export function ResultDisplay({
  detail,
  local,
  includeSpecialTools = false,
}: {
  detail: AnalysisDetail;
  /** Lokal gesicherte Analyse (nur Ansicht): Fotos und Werkzeug-Ergebnisse vom Gerät */
  local?: { photos: Blob[]; tools: ToolResult[] };
  /** Berufs-Spezial-Tool-Ergebnisse der Sitzung mit exportieren (Startseite, wie V2) */
  includeSpecialTools?: boolean;
}) {
  const result = detail.result;
  const overlay = useOverlay(local ? "" : detail.id);
  const genericResults = useToolResults(detail.id);
  const specialResults = useToolResults(SPECIAL_SCOPE);
  const exportTools: ToolResult[] = local
    ? local.tools
    : [...genericResults, ...(includeSpecialTools ? specialResults : [])];
  const photoSource: PhotoSource = local ? { kind: "local", photos: local.photos } : { kind: "server" };
  const [selected, setSelected] = useState<number | null>(null);
  const anchors = overlay.data?.anchors ?? [];
  const selectedAnchor = anchors.find((a) => a.component_index === selected);
  const [firstStep, ...otherSteps] = result.solution_steps;
  const qualifiedFirst = result.safety.qualified_person_required && firstStep?.startsWith("Achtung:");
  const steps = qualifiedFirst ? otherSteps : result.solution_steps;

  return (
    <div className="space-y-6 rounded-xl border-t-4 border-(--accent) bg-white p-6 shadow-2xl">
      <div className="space-y-1">
        <h2 className="flex items-center text-2xl font-bold text-gray-800">
          <ClipboardList className="mr-2 h-6 w-6 text-(--accent)" aria-hidden="true" />
          Lösung und Diagnose
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <TradeChip trade={result.trade} />
          <span>{formatDateTime(detail.created_at)}</span>
          {detail.captures.length === 0 && <span>· ohne Foto</span>}
        </div>
      </div>

      <SafetyPanel result={result} />

      {/* Diagnose wie V2: Textbereich mit grauem Hintergrund */}
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 leading-relaxed text-gray-700">
        {result.diagnosis ? (
          <>
            <p>
              <strong>Diagnose:</strong> {result.diagnosis}
            </p>
            <p className="text-sm text-gray-600">{result.summary}</p>
          </>
        ) : (
          <p>{result.summary}</p>
        )}
        {detail.note && <p className="text-sm text-gray-500">Ihre Beschreibung: {detail.note}</p>}
      </div>

      <ExportButtons detail={detail} tools={exportTools} photos={photoSource} canSaveLocally={!local} />

      <ReadAloud result={result} />

      {result.solution_steps.length > 0 && (
        <section className="space-y-2" aria-label="Lösung">
          <h3 className="flex items-center text-lg font-semibold text-gray-700">
            <Wrench className="mr-2 h-5 w-5 text-(--accent)" aria-hidden="true" />
            Schrittweise Lösung
          </h3>
          {qualifiedFirst && (
            <p
              role="note"
              className="flex items-start gap-2 rounded-lg border-l-4 border-red-500 bg-red-100 p-2.5 text-sm font-semibold text-red-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {firstStep}
            </p>
          )}
          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-inner">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent) text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {local ? (
        local.tools.length > 0 && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-lg font-semibold text-gray-700">Gespeicherte KI-Tool-Ergebnisse:</h3>
            {local.tools.map((t) => (
              <ToolResultCard key={t.tool_id} result={t} />
            ))}
          </div>
        )
      ) : (
        <GenericTools detail={detail} />
      )}

      {local && local.photos.length > 0 && <LocalPhotos photos={local.photos} />}

      {!local && detail.captures.length > 0 && (
        <section className="space-y-2" aria-label="Fotos">
          <h3 className="text-lg font-semibold text-gray-700">Fotos</h3>
          {!result.image_quality.usable && (
            <p role="alert" className="rounded-lg bg-orange-100 px-3 py-2 text-sm text-orange-900">
              Bildqualität reicht nicht aus: {result.image_quality.issues.join(", ") || "unbekannt"}.
            </p>
          )}
          {anchors.length > 0 && (
            <p className="text-xs text-gray-500">Markierung antippen, um Details zum Bauteil zu sehen.</p>
          )}
          {detail.captures.map((capture) => (
            <PhotoMarkers
              key={capture.id}
              capture={capture}
              imageUrl={captureImageUrl(detail.id, capture.id)}
              anchors={anchors}
              selected={selected}
              onSelect={setSelected}
            />
          ))}
          {selectedAnchor && <AnchorDetails anchor={selectedAnchor} />}
        </section>
      )}

      <section className="space-y-2 border-t border-gray-100 pt-4" aria-label="Nächste Prüfschritte">
        <h3 className="flex items-center text-lg font-semibold text-gray-700">
          <ListChecks className="mr-2 h-5 w-5 text-(--accent)" aria-hidden="true" />
          Nächste Prüfschritte
        </h3>
        <p className="text-xs text-gray-500">
          {detail.checks.filter((c) => c.status === "open").length} von {detail.checks.length} offen.
          Abhaken dokumentiert Ihre Arbeit – es ändert nicht die Einschätzung und ist keine Freigabe.
        </p>
        <ol className="space-y-2">
          {detail.checks.map((check) =>
            local ? (
              <li key={check.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-inner">
                <span className="font-medium">{check.action}</span>
                {check.requires_qualified_person && <strong className="text-red-700"> – nur Fachkraft</strong>}
                <span className="block text-xs text-gray-500">
                  Status: {check.status === "done" ? "erledigt" : check.status === "not_applicable" ? "nicht zutreffend" : "offen"}
                </span>
              </li>
            ) : (
              <CheckItemCard key={check.id} analysisId={detail.id} check={check} result={result} />
            ),
          )}
        </ol>
      </section>

      {result.findings.length > 0 && (
        <ResultBox title="Auffälligkeiten">
          <ul className="space-y-2">
            {result.findings.map((f, i) => (
              <li key={i}>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 text-xs font-semibold ${SEVERITY_STYLES[f.severity]}`}>
                    {SEVERITY_LABELS[f.severity]}
                  </span>
                  <span className="font-medium text-gray-800">{f.title}</span>
                </div>
                <p className="text-gray-600">
                  {f.reasoning} <span className="text-gray-400">({CONFIDENCE_LABELS[f.confidence]})</span>
                </p>
              </li>
            ))}
          </ul>
        </ResultBox>
      )}

      <ResultBox title="Unsicherheiten">
        <ul className="list-disc space-y-1 pl-5">
          {result.uncertainties.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </ResultBox>

      {(result.observations.length > 0 || result.components.length > 0) && (
        <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-inner">
          <summary className="cursor-pointer font-bold text-gray-800">
            Beobachtungen und Bauteile ({result.observations.length + result.components.length})
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {result.observations.map((o, i) => (
              <li key={i}>
                {o.text} <span className="text-gray-400">({CONFIDENCE_LABELS[o.confidence]})</span>
              </li>
            ))}
          </ul>
          <ol className="mt-3 space-y-2">
            {result.components.map((c, i) => (
              <li key={i} className="rounded-lg border border-gray-200 p-2">
                <div className="font-medium">
                  {i + 1}. {c.name} <span className="font-normal text-gray-500">· {c.category}</span>
                </div>
                {c.labels.map((label) => (
                  <div key={label.text} className={label.confidence === "low" ? "text-orange-800" : ""}>
                    „{label.text}“ – {CONFIDENCE_LABELS[label.confidence]}
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </details>
      )}

      {local ? (
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <HardDrive className="h-4 w-4" aria-hidden="true" />
          Lokal auf diesem Gerät gespeichert (nur Ansicht).
        </p>
      ) : (
        <AssignProject detail={detail} />
      )}

      <ShareButton detail={detail} tools={exportTools} photos={photoSource} />

      <footer className="space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-500">
        <p>
          Quelle: {result.source.provider_id} / {result.source.model_id} · Schema {result.schema_version} ·
          Sicherheitsprüfung {result.policy.version}
        </p>
        {result.policy.interventions.length > 0 && (
          <details>
            <summary>Eingriffe der Sicherheitsprüfung ({result.policy.interventions.length})</summary>
            <ul className="mt-1 list-disc pl-5">
              {result.policy.interventions.map((i) => (
                <li key={`${i.rule_id}-${i.description}`}>{i.description}</li>
              ))}
            </ul>
          </details>
        )}
      </footer>
    </div>
  );
}

function LocalPhotos({ photos }: { photos: Blob[] }) {
  const urls = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <section className="space-y-2" aria-label="Fotos">
      <h3 className="text-lg font-semibold text-gray-700">Fotos</h3>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((u, i) => (
          <img key={u} src={u} alt={`Foto ${i + 1}`} className="w-full rounded-lg border border-gray-200" />
        ))}
      </div>
    </section>
  );
}

function ResultBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-inner">
      <h4 className="mb-3 font-bold text-gray-800">{title}</h4>
      {children}
    </section>
  );
}

function AnchorDetails({ anchor }: { anchor: OverlayAnchor }) {
  return (
    <div className="space-y-2 rounded-xl border border-l-4 border-gray-200 border-l-(--accent) bg-white p-3 shadow-inner" aria-live="polite">
      <div className="font-semibold">
        {anchor.component_index + 1}. {anchor.name}
      </div>
      {anchor.labels.map((label) => (
        <div key={label.text} className="text-sm">
          „{label.text}“ – {CONFIDENCE_LABELS[label.confidence]}
        </div>
      ))}
      {anchor.findings.map((f) => (
        <div key={f.index} className="text-sm">
          <span className={`mr-2 rounded px-1.5 text-xs font-semibold ${SEVERITY_STYLES[f.severity]}`}>
            {SEVERITY_LABELS[f.severity]}
          </span>
          {f.title}
        </div>
      ))}
      {anchor.checks.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {anchor.checks.map((c) => (
            <li key={c.position}>
              {c.action}
              {c.requires_qualified_person && <strong> – nur Fachkraft</strong>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Optional wie gewünscht: Analyse einem Projekt zuordnen (V3-Erweiterung). */
function AssignProject({ detail }: { detail: AnalysisDetail }) {
  const projects = useProjects();
  const assign = useAssignProject(detail.id);
  const [choice, setChoice] = useState("");
  const current = projects.data?.find((p) => p.id === detail.project_id);

  if (current) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-600">
        <FolderPlus className="h-4 w-4 text-(--accent)" aria-hidden="true" />
        Projekt:{" "}
        <Link to={`/projects/${current.id}`} className="font-semibold text-(--accent) underline">
          {current.name}
        </Link>
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <label htmlFor={`assign-${detail.id}`} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <FolderPlus className="h-4 w-4 text-(--accent)" aria-hidden="true" />
        Einem Projekt zuordnen (optional)
      </label>
      {projects.data && projects.data.length > 0 ? (
        <div className="flex gap-2">
          <select
            id={`assign-${detail.id}`}
            className="field"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Projekt wählen …</option>
            {projects.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-accent shrink-0 px-4 py-2 text-sm"
            disabled={!choice || assign.isPending}
            onClick={() => assign.mutate(choice)}
          >
            Zuordnen
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          Noch keine Projekte –{" "}
          <Link to="/" className="font-semibold text-(--accent) underline">
            Projekt anlegen
          </Link>
          .
        </p>
      )}
      {assign.isError && <ErrorMessage error={assign.error} />}
    </div>
  );
}
