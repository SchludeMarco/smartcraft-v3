import { Camera, Image as ImageIcon, Loader2, RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Trade, TradeOption } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { StepBadge } from "../../components/StepBadge";
import { MAX_UPLOAD_BYTES, resizeImage } from "../../lib/resizeImage";
import { TRADE_THEMES, tradeStyle } from "../../lib/trades";
import { useProject } from "../projects/api";
import { useCreateAnalysis, useTrades } from "./api";

const MAX_PHOTOS = 5;
const MAX_NOTE = 2000;

type Photo = { id: string; blob: Blob; url: string };

let photoCounter = 0;

/** Kurzname für die Kachel: „Klempner (Sanitär/Heizung)“ → „Klempner“ */
function shortLabel(label: string): string {
  return label.split(" (")[0] ?? label;
}

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
      className={`flex min-w-0 flex-col items-center justify-center rounded-2xl border-2 px-0 py-1 text-white shadow-lg transition-all duration-300 active:scale-[0.98] ${
        selected
          ? "border-steel shadow-2xl ring-2 ring-steel ring-offset-2 ring-offset-parchment"
          : "border-black/10 opacity-90 hover:opacity-100"
      }`}
    >
      <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/30 sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 text-white sm:h-6 sm:w-6" aria-hidden="true" />
      </span>
      <span className="w-full min-w-0 text-center text-[9px] leading-[1.1] font-semibold break-words hyphens-auto sm:text-xs">
        {shortLabel(option.label).replace("/", "/​")}
      </span>
    </button>
  );
}

export function NewAnalysisPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const trades = useTrades();
  const create = useCreateAnalysis(projectId);

  const [trade, setTrade] = useState<Trade | null>(null);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Vorschau-URLs erst beim Verlassen der Seite freigeben (einzelne beim Entfernen)
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const totalBytes = useMemo(() => photos.reduce((sum, p) => sum + p.blob.size, 0), [photos]);
  const selectedLabel = trades.data?.find((t) => t.id === trade)?.label;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // gleiche Datei erneut wählbar
    if (files.length === 0) return;
    const free = MAX_PHOTOS - photos.length;
    setFormError(files.length > free ? `Höchstens ${MAX_PHOTOS} Fotos pro Analyse.` : null);
    setProcessing(true);
    try {
      const added: Photo[] = [];
      for (const file of files.slice(0, Math.max(0, free))) {
        const blob = await resizeImage(file);
        photoCounter += 1;
        added.push({ id: `foto-${photoCounter}`, blob, url: URL.createObjectURL(blob) });
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
    create.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trade) return setFormError("Bitte einen Beruf auswählen.");
    if (photos.length === 0) return setFormError("Bitte mindestens ein Foto aufnehmen.");
    if (totalBytes > MAX_UPLOAD_BYTES) {
      return setFormError("Die Fotos sind zusammen zu groß. Bitte weniger Fotos auswählen.");
    }
    setFormError(null);
    create.mutate(
      { trade, note, photos: photos.map((p) => p.blob) },
      { onSuccess: (detail) => navigate(`/analyses/${detail.id}`, { replace: true }) },
    );
  }

  const busy = processing || create.isPending;
  const full = photos.length >= MAX_PHOTOS;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6" style={tradeStyle(trade)}>
      <div className="space-y-1">
        <Link to={`/projects/${projectId}`} className="text-sm font-semibold text-steel">
          ← {project.data?.name ?? "Projekt"}
        </Link>
        <h1 className="font-display text-2xl font-bold text-wood-dark">Neue Analyse</h1>
      </div>

      <section>
        <StepBadge>1. Beruf auswählen</StepBadge>
        <div
          role="group"
          aria-label="Beruf"
          className="grid grid-cols-5 gap-1.5 rounded-xl border-2 border-steel/50 bg-parchment-dark/60 p-2 shadow-inner"
        >
          {trades.data?.map((option) => (
            <TradeButton key={option.id} option={option} selected={trade === option.id} onSelect={setTrade} />
          ))}
        </div>
        {selectedLabel && (
          <p className="mt-3 text-sm font-medium text-stone-600">
            Aktueller Beruf: <span className="font-bold text-(--accent)">{selectedLabel}</span>
          </p>
        )}
      </section>

      <section>
        <StepBadge>2. Problem dokumentieren &amp; analysieren</StepBadge>
        <div className="panel-parchment space-y-4 rounded-xl p-4">
          <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-stone-300 pb-2 text-sm font-semibold whitespace-nowrap text-stone-700">
            <label className={`flex items-center gap-1 ${full || busy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <Camera className="h-5 w-5 text-(--accent)" aria-hidden="true" />
              <span>Foto aufnehmen</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFiles}
                disabled={busy || full}
              />
            </label>
            <label className={`flex items-center gap-1 ${full || busy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}>
              <ImageIcon className="h-5 w-5 text-(--accent)" aria-hidden="true" />
              <span>Aus Galerie</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFiles}
                disabled={busy || full}
                data-testid="gallery-input"
              />
            </label>
            <span className="ml-auto text-xs font-normal text-stone-500">
              Fotos: {photos.length}/{MAX_PHOTOS}
            </span>
          </div>

          {photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <li key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt={`Foto ${i + 1}`}
                    className="aspect-square w-full rounded-lg border-2 border-(--accent-soft) object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 rounded-full bg-stone-900/80 px-2 text-sm text-white"
                    aria-label={`Foto ${i + 1} entfernen`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border-4 border-dashed border-(--accent-soft) p-6 text-center text-sm text-stone-500">
              Noch kein Foto. Frontal, scharf und gut ausgeleuchtet fotografieren – Beschriftungen lesbar.
            </p>
          )}
          {processing && <p className="text-sm text-stone-500">Fotos werden vorbereitet …</p>}

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-stone-700">Problembeschreibung (optional)</span>
            <textarea
              className="input-parchment"
              rows={3}
              maxLength={MAX_NOTE}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Unterverteilung im Keller, FI löst sporadisch aus"
            />
          </label>
          <p className="text-xs text-stone-500">Standortdaten der Fotos werden vor dem Hochladen entfernt.</p>

          {formError && <ErrorMessage error={new Error(formError)} />}
          {create.isError && <ErrorMessage error={create.error} />}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="btn-parchment flex shrink-0 items-center justify-center gap-1 px-3 py-3 text-xs sm:px-4 sm:text-sm"
              aria-label="Zurücksetzen"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden min-[400px]:inline">Zurücksetzen</span>
            </button>
            <button type="submit" disabled={busy} className="btn-quest flex flex-1 items-center justify-center gap-2 py-3 whitespace-nowrap">
              {create.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Analysiere …
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" aria-hidden="true" />
                  Problem analysieren
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
