import {
  AlertTriangle,
  Camera,
  CheckCircle,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Smartphone,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useSearchParams } from "react-router";
import type { Trade, TradeOption } from "../../api/types";
import { useCurrentTrade } from "../../lib/currentTrade";
import { MAX_UPLOAD_BYTES, resizeImage } from "../../lib/resizeImage";
import { TRADE_THEMES } from "../../lib/trades";
import { celebrateCompletion } from "../../lib/celebrate";
import { queueAnalysis } from "../../lib/offlineQueue";
import { useOffline } from "../offline/OfflineContext";
import { OfflineQueueModal } from "../offline/OfflineQueueModal";
import { useProject } from "../projects/api";
import { TradeTools } from "../tools/TradeTools";
import { useAnalysis, useCreateAnalysis, useTrades } from "./api";
import { ResultDisplay } from "./ResultDisplay";

const MAX_PHOTOS = 5;
const MAX_NOTE = 2000;

type Photo = { id: string; blob: Blob; url: string };

let photoCounter = 0;

/** Kurzname wie V2: „Klempner (Sanitär/Heizung)“ → „Klempner“ */
function shortLabel(label: string): string {
  return label.split(" (")[0] ?? label;
}

/** Berufskachel wie V2 (TradeButton). */
function TradeButton({
  option,
  selected,
  onSelect,
}: {
  option: TradeOption;
  selected: boolean;
  onSelect: (trade: Trade) => void;
}) {
  const theme = TRADE_THEMES[option.id];
  const Icon = theme.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      aria-pressed={selected}
      aria-label={option.label}
      title={option.label}
      style={{ backgroundColor: selected ? theme.accentDark : theme.accent }}
      className={`flex min-w-0 transform flex-col items-center justify-center rounded-2xl border-2 px-0 py-1 text-white shadow-lg transition-colors duration-500 ease-in-out active:scale-[0.98] ${
        selected
          ? "border-steel shadow-2xl ring-2 ring-steel ring-offset-2 ring-offset-parchment"
          : "border-black/10 opacity-90 hover:opacity-100"
      }`}
    >
      <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/30 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 text-white sm:h-6 sm:w-6" aria-hidden="true" />
      </span>
      <span className="w-full min-w-0 text-center text-[9px] leading-[1.1] font-semibold break-words hyphens-auto text-white sm:text-xs">
        {shortLabel(option.label).replace("/", "/​")}
      </span>
    </button>
  );
}

/**
 * Startseite = V2-Ablauf: 1. Beruf auswählen → 2. Problem dokumentieren & analysieren →
 * 3. Ergebnis der KI-Analyse. Foto ODER Beschreibung reicht.
 */
export function HomePage() {
  const { trade, setTrade } = useCurrentTrade();
  const trades = useTrades();
  const create = useCreateAnalysis();
  const [params, setParams] = useSearchParams();
  const projectId = params.get("projekt");
  const project = useProject(projectId ?? "");

  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { online, pending } = useOffline();
  const [queuedInfo, setQueuedInfo] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  // Ergebnis über den Query-Cache, damit spätere Änderungen (Projekt, Prüfschritte) sichtbar sind
  const [resultId, setResultId] = useState<string | null>(null);
  const resultQuery = useAnalysis(resultId ?? "", resultId !== null);
  const result = resultQuery.data ?? null;

  // Vorschau-URLs beim Verlassen der Seite freigeben (einzelne beim Entfernen)
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  );

  const selectedLabel = trades.data?.find((t) => t.id === trade)?.label;
  const full = photos.length >= MAX_PHOTOS;
  const busy = processing || create.isPending;
  const canAnalyze = photos.length > 0 || note.trim().length > 0;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // gleiche Datei erneut wählbar
    if (files.length === 0) return;
    const free = MAX_PHOTOS - photos.length;
    setFormError(
      files.length > free ? `Höchstens ${MAX_PHOTOS} Fotos pro Analyse.` : null,
    );
    setProcessing(true);
    try {
      const added: Photo[] = [];
      for (const file of files.slice(0, Math.max(0, free))) {
        const blob = await resizeImage(file);
        photoCounter += 1;
        added.push({
          id: `foto-${photoCounter}`,
          blob,
          url: URL.createObjectURL(blob),
        });
      }
      setPhotos((current) => [...current, ...added]);
    } catch {
      setFormError("Mindestens ein Foto konnte nicht gelesen werden.");
    } finally {
      setProcessing(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return current.filter((p) => p.id !== id);
    });
  }

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setNote("");
    setFormError(null);
    setResultId(null);
    create.reset();
  }

  async function saveForLater() {
    try {
      await queueAnalysis({
        trade,
        note,
        photos: photos.map((p) => p.blob),
        projectId,
      });
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      setNote("");
      setQueuedInfo(true);
    } catch {
      setFormError(
        "Die Analyse konnte auf diesem Gerät nicht gespeichert werden.",
      );
    }
  }

  function analyze() {
    if (!canAnalyze) return;
    setQueuedInfo(false);
    if (!online) {
      void saveForLater();
      return;
    }
    if (photos.reduce((sum, p) => sum + p.blob.size, 0) > MAX_UPLOAD_BYTES) {
      setFormError(
        "Die Fotos sind zusammen zu groß. Bitte weniger Fotos auswählen.",
      );
      return;
    }
    setFormError(null);
    setResultId(null);
    create.mutate(
      { trade, note, photos: photos.map((p) => p.blob), projectId },
      {
        onSuccess: (detail) => {
          setResultId(detail.id);
          celebrateCompletion();
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {projectId && (
        <div className="flex items-start gap-3 rounded-xl border-l-4 border-(--accent) bg-(--accent-soft) p-3 shadow-md">
          <FolderOpen
            className="mt-1 h-5 w-5 shrink-0 text-(--accent)"
            aria-hidden="true"
          />
          <p className="grow text-sm text-gray-700">
            Neue Analyse für Projekt{" "}
            <Link
              to={`/projects/${projectId}`}
              className="font-bold text-(--accent-dark) underline"
            >
              {project.data?.name ?? "…"}
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setParams({})}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--accent) text-white hover:bg-(--accent-dark)"
            title="Ohne Projekt analysieren"
            aria-label="Ohne Projekt analysieren"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 1. Beruf auswählen */}
      <section>
        <h2 className="mb-3">
          <span className="badge-pill">1. Beruf auswählen</span>
        </h2>
        <div
          role="group"
          aria-label="Beruf"
          className="grid grid-cols-5 gap-1.5 rounded-xl border-2 border-steel/50 bg-parchment-dark/60 p-2 shadow-inner"
        >
          {trades.data?.map((option) => (
            <TradeButton
              key={option.id}
              option={option}
              selected={trade === option.id}
              onSelect={setTrade}
            />
          ))}
        </div>
        {selectedLabel && (
          <p className="mt-3 text-sm font-medium text-gray-600 transition-colors duration-500 ease-in-out">
            Aktueller Beruf:{" "}
            <span className="font-bold text-(--accent)">{selectedLabel}</span>
          </p>
        )}
      </section>

      {/* 2. Problem dokumentieren & analysieren */}
      <section>
        <h2 className="mb-3">
          <span className="badge-pill">
            2. Problem dokumentieren &amp; analysieren
          </span>
        </h2>
        <div className="panel-parchment rounded-xl p-4">
          <div className="-mt-2 mb-4 flex gap-4 border-b pb-2 text-sm font-semibold text-gray-700">
            <label
              className={`flex items-center gap-1 transition-colors duration-500 ease-in-out ${
                full || busy
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:text-(--accent)"
              }`}
            >
              <Camera className="h-5 w-5 text-(--accent)" aria-hidden="true" />
              <span>Foto aufnehmen</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFiles}
                disabled={busy || full}
              />
            </label>
            <label
              className={`flex items-center gap-1 transition-colors duration-500 ease-in-out ${
                full || busy
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:text-(--accent)"
              }`}
            >
              <ImageIcon
                className="h-5 w-5 text-(--accent)"
                aria-hidden="true"
              />
              <span>Galerie</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFiles}
                disabled={busy || full}
                data-testid="gallery-input"
              />
            </label>
          </div>

          <div className="mt-2">
            {photos.length > 0 && (
              <div className="mb-4">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-gray-100"
                    >
                      <img
                        src={photo.url}
                        alt={`Foto ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-xs text-white transition hover:bg-black/70"
                        title="Bild entfernen"
                        aria-label={`Foto ${i + 1} entfernen`}
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {photos.length}/{MAX_PHOTOS} Bilder ausgewählt
                </p>
              </div>
            )}
            {processing && (
              <p className="mb-2 text-xs text-gray-500">
                Fotos werden vorbereitet …
              </p>
            )}
            <label htmlFor="problem-desc" className="sr-only">
              Problembeschreibung
            </label>
            <textarea
              id="problem-desc"
              rows={2}
              maxLength={MAX_NOTE}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Z.B. 'Dachbalken zeigt Risse nach Feuchtigkeitsschaden.' (Optional)"
              className="field resize-none"
            />
          </div>
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-3 rounded-lg border-l-4 border-red-500 bg-red-100 p-2.5 text-sm text-red-700"
          >
            {formError}
          </p>
        )}

        <div className="mt-4 flex w-full gap-3">
          <button
            type="button"
            onClick={reset}
            disabled={create.isPending}
            className="btn-parchment flex w-1/3 items-center justify-center py-3 text-sm"
          >
            <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
            Zurücksetzen
          </button>
          <button
            type="button"
            onClick={analyze}
            disabled={busy || !canAnalyze}
            className="btn-quest flex w-2/3 items-center justify-center py-3 transition duration-300"
          >
            {create.isPending ? (
              <>
                <Loader2
                  className="mr-2 h-5 w-5 animate-spin text-white"
                  aria-hidden="true"
                />
                Analysiere...
              </>
            ) : !online ? (
              <>
                <Zap className="mr-2 h-5 w-5" aria-hidden="true" />
                Für später speichern (offline)
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" aria-hidden="true" />
                Problem analysieren
              </>
            )}
          </button>
        </div>
        {queuedInfo && (
          <p
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border-l-4 border-green-400 bg-green-50 p-3 text-xs text-green-800 shadow-md"
          >
            <CheckCircle
              className="h-4 w-4 shrink-0 text-green-500"
              aria-hidden="true"
            />
            Kein Empfang: Diese Analyse wurde gespeichert und wird automatisch
            durchgeführt, sobald wieder eine Verbindung besteht. Sie finden das
            Ergebnis danach im Verlauf.
          </p>
        )}
        {pending.length > 0 && (
          <button
            type="button"
            onClick={() => setShowQueue(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-(--accent) underline hover:text-(--accent-dark)"
          >
            <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
            {pending.length}{" "}
            {pending.length === 1 ? "Analyse wartet" : "Analysen warten"} auf
            Verbindung — verwalten
          </button>
        )}
        {showQueue && <OfflineQueueModal onClose={() => setShowQueue(false)} />}
        <p className="mt-2 text-center text-[11px] text-gray-500">
          Standortdaten der Fotos werden vor dem Hochladen entfernt.
        </p>
      </section>

      {/* 3. Ergebnis der KI-Analyse */}
      <section className="mt-6">
        <h2 className="mb-3">
          <span className="badge-pill">3. Ergebnis der KI-Analyse</span>
        </h2>
        {create.isPending ? (
          <div className="panel-parchment flex flex-col items-center justify-center rounded-xl p-8">
            <Loader2
              className="h-8 w-8 animate-spin text-(--accent)"
              aria-hidden="true"
            />
            <p className="mt-4 font-semibold text-gray-700">Analyse läuft...</p>
            <p className="text-sm text-gray-500">
              Der Bau-Experte prüft die Situation.
            </p>
          </div>
        ) : create.isError ? (
          <div
            role="alert"
            className="relative flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-100 p-4 pr-10 text-red-700 shadow-md"
          >
            <button
              type="button"
              onClick={() => create.reset()}
              aria-label="Fehler zurücksetzen"
              title="Fehler zurücksetzen (Bilder bleiben erhalten)"
              className="absolute top-2 right-2 rounded-full p-1 text-red-500 transition-colors hover:bg-red-200 hover:text-red-800"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <AlertTriangle
              className="mt-1 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">Analysefehler</p>
              <p className="text-sm">{create.error.message}</p>
              <p className="mt-1 text-xs text-red-500">
                Ihre Bilder bleiben erhalten. Tippen Sie oben rechts, um es
                erneut zu versuchen.
              </p>
            </div>
          </div>
        ) : result ? (
          <ResultDisplay detail={result} includeSpecialTools />
        ) : (
          <div className="panel-parchment rounded-xl border-4 border-dashed border-(--accent-soft) p-8 text-center text-gray-500 transition-colors duration-700 ease-in-out">
            <Smartphone
              className="mx-auto mb-3 h-8 w-8 text-(--accent)"
              aria-hidden="true"
            />
            <p className="text-lg font-semibold text-gray-800">
              Starten Sie Ihre Bauanalyse
            </p>
            <p className="mt-2 text-sm font-bold text-gray-600">
              Um die Analyse zu starten, benötigen Sie eines der folgenden
              Elemente:
            </p>
            <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-sm text-gray-700">
              <li>
                <span className="mr-1 font-bold text-(--accent)">1.</span> Ein
                oder mehrere Fotos der Problemstelle (Abschnitt 2)
              </li>
              <li>
                <span className="mr-1 font-bold text-(--accent)">2.</span> Eine
                detaillierte Problembeschreibung (Abschnitt 2)
              </li>
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              Wählen Sie zuerst Ihren Beruf (Abschnitt 1) für eine präzisere
              Diagnose.
            </p>
          </div>
        )}
      </section>

      <TradeTools trade={trade} analysisId={result?.id ?? null} note={note} />
    </div>
  );
}
