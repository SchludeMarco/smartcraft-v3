import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Trade } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { MAX_UPLOAD_BYTES, resizeImage } from "../../lib/resizeImage";
import { useProject } from "../projects/api";
import { useCreateAnalysis, useTrades } from "./api";

const MAX_PHOTOS = 5;
const MAX_NOTE = 2000;

type Photo = { id: string; blob: Blob; url: string };

let photoCounter = 0;

export function NewAnalysisPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const trades = useTrades();
  const create = useCreateAnalysis(projectId);

  const [trade, setTrade] = useState<Trade | "">("");
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

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // gleiche Datei erneut wählbar
    if (files.length === 0) return;
    const free = MAX_PHOTOS - photos.length;
    if (files.length > free) {
      setFormError(`Höchstens ${MAX_PHOTOS} Fotos pro Analyse.`);
    } else {
      setFormError(null);
    }
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!trade) return setFormError("Bitte ein Gewerk auswählen.");
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Link to={`/projects/${projectId}`} className="text-sm text-amber-700">
        ← {project.data?.name ?? "Projekt"}
      </Link>
      <h1 className="text-2xl font-bold">Neue Analyse</h1>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Gewerk *</span>
        <select
          className="w-full rounded border border-stone-300 bg-white px-3 py-3 text-base"
          value={trade}
          onChange={(e) => setTrade(e.target.value as Trade | "")}
        >
          <option value="">Bitte wählen …</option>
          {trades.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <section className="space-y-2">
        <span className="text-sm font-medium">
          Fotos * ({photos.length}/{MAX_PHOTOS})
        </span>
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <li key={photo.id} className="relative">
                <img
                  src={photo.url}
                  alt={`Foto ${i + 1}`}
                  className="aspect-square w-full rounded object-cover"
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
        )}
        {photos.length < MAX_PHOTOS && (
          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer rounded bg-stone-900 px-3 py-3 text-center font-semibold text-white">
              Foto aufnehmen
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFiles}
                disabled={busy}
              />
            </label>
            <label className="cursor-pointer rounded border border-stone-400 bg-white px-3 py-3 text-center font-semibold">
              Aus Galerie
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={handleFiles}
                disabled={busy}
                data-testid="gallery-input"
              />
            </label>
          </div>
        )}
        {processing && <p className="text-sm text-stone-500">Fotos werden vorbereitet …</p>}
        <p className="text-xs text-stone-500">
          Tipp: frontal, scharf und gut ausgeleuchtet fotografieren, Beschriftungen lesbar.
          Standortdaten werden vor dem Hochladen entfernt.
        </p>
      </section>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Notiz (optional)</span>
        <textarea
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-base"
          rows={3}
          maxLength={MAX_NOTE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Unterverteilung im Keller, FI löst sporadisch aus"
        />
      </label>

      {formError && <ErrorMessage error={new Error(formError)} />}
      {create.isError && <ErrorMessage error={create.error} />}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-amber-600 px-4 py-4 text-lg font-semibold text-white disabled:opacity-60"
      >
        {create.isPending ? "Wird analysiert …" : "Analysieren"}
      </button>
    </form>
  );
}
