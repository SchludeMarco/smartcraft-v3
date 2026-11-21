import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import type { AnalysisResult, CheckItem, OverlayAnchor } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { formatDateTime } from "../../lib/format";
import { captureImageUrl, useAnalysis, useOverlay } from "./api";
import { CONFIDENCE_LABELS, SEVERITY_LABELS, SEVERITY_STYLES } from "./labels";
import { CheckItemCard } from "./CheckItemCard";
import { PhotoMarkers } from "./PhotoMarkers";
import { SafetyPanel } from "./SafetyPanel";

export function AnalysisPage() {
  const { analysisId = "" } = useParams();
  const analysis = useAnalysis(analysisId);
  const overlay = useOverlay(analysisId);
  const [selected, setSelected] = useState<number | null>(null);

  if (analysis.isPending) return <p className="text-stone-500">Lade Analyse …</p>;
  if (analysis.isError) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={analysis.error} />
        <Link to="/" className="text-amber-700 underline">
          Zur Projektübersicht
        </Link>
      </div>
    );
  }

  const detail = analysis.data;
  const result = detail.result;
  const anchors = overlay.data?.anchors ?? [];
  const selectedAnchor = anchors.find((a) => a.component_index === selected);

  return (
    <article className="space-y-5">
      <Link to={`/projects/${detail.project_id}`} className="text-sm text-amber-700">
        ← Zum Projekt
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Analyse</h1>
        <p className="text-sm text-stone-500">{formatDateTime(detail.created_at)}</p>
      </header>

      <SafetyPanel result={result} />

      <p className="text-stone-800">{result.summary}</p>
      {detail.note && <p className="text-sm text-stone-600">Notiz: {detail.note}</p>}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Fotos</h2>
        {!result.image_quality.usable && (
          <p role="alert" className="rounded bg-orange-100 px-3 py-2 text-sm text-orange-900">
            Bildqualität reicht nicht aus: {result.image_quality.issues.join(", ") || "unbekannt"}.
          </p>
        )}
        {anchors.length > 0 && (
          <p className="text-xs text-stone-500">Markierung antippen, um Details zum Bauteil zu sehen.</p>
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

      <ChecksSection analysisId={detail.id} checks={detail.checks} result={result} />
      <FindingsSection result={result} />

      <Section title="Beobachtungen">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {result.observations.map((o, i) => (
            <li key={i}>
              {o.text} <span className="text-stone-500">({CONFIDENCE_LABELS[o.confidence]})</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Unsicherheiten">
        <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
          {result.uncertainties.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Section>

      <Section title="Bauteile und Beschriftungen">
        <ol className="space-y-2 text-sm">
          {result.components.map((c, i) => (
            <li key={i} className="rounded bg-white p-3 shadow-sm">
              <div className="font-medium">
                {i + 1}. {c.name} <span className="font-normal text-stone-500">· {c.category}</span>
              </div>
              {c.labels.map((label) => (
                <div key={label.text} className={label.confidence === "low" ? "text-orange-800" : ""}>
                  „{label.text}“ – {CONFIDENCE_LABELS[label.confidence]}
                </div>
              ))}
            </li>
          ))}
        </ol>
      </Section>

      <footer className="space-y-1 border-t border-stone-300 pt-3 text-xs text-stone-500">
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
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function AnchorDetails({ anchor }: { anchor: OverlayAnchor }) {
  return (
    <div className="space-y-2 rounded-lg bg-white p-3 shadow" aria-live="polite">
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

function ChecksSection({
  analysisId,
  checks,
  result,
}: {
  analysisId: string;
  checks: CheckItem[];
  result: AnalysisResult;
}) {
  const open = checks.filter((c) => c.status === "open").length;
  return (
    <Section title="Nächste Prüfschritte">
      <p className="text-xs text-stone-500">
        {open} von {checks.length} offen. Abhaken dokumentiert deine Arbeit – es ändert nicht die
        Einschätzung und ist keine Freigabe.
      </p>
      <ol className="space-y-2">
        {checks.map((check) => (
          <CheckItemCard key={check.id} analysisId={analysisId} check={check} result={result} />
        ))}
      </ol>
    </Section>
  );
}

function FindingsSection({ result }: { result: AnalysisResult }) {
  if (result.findings.length === 0) return null;
  return (
    <Section title="Auffälligkeiten">
      <ul className="space-y-2">
        {result.findings.map((f, i) => (
          <li key={i} className="rounded-lg bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 text-xs font-semibold ${SEVERITY_STYLES[f.severity]}`}>
                {SEVERITY_LABELS[f.severity]}
              </span>
              <span className="font-medium">{f.title}</span>
            </div>
            <p className="text-sm text-stone-600">
              {f.reasoning} <span className="text-stone-500">({CONFIDENCE_LABELS[f.confidence]})</span>
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
