import { AlertTriangle, CheckCircle, FileText, Loader2, Save, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AnalysisDetail, ToolResult } from "../../api/types";
import { saveLocalAnalysis } from "../../lib/localAnalyses";
import { captureImageUrl, useTrades } from "../analysis/api";
import { buildPrintHtml, buildShareText, openPrintWindow, type ReportInput } from "./report";
import { ShareModal } from "./ShareModal";

/** Woher die Fotos kommen: Server (gespeicherte Analyse) oder lokal gesicherte Blobs. */
export type PhotoSource = { kind: "server" } | { kind: "local"; photos: Blob[] };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Foto nicht lesbar"));
    reader.readAsDataURL(blob);
  });
}

async function loadPhotoBlobs(detail: AnalysisDetail, source: PhotoSource): Promise<Blob[]> {
  if (source.kind === "local") return source.photos;
  return Promise.all(
    detail.captures.map(async (c) => {
      const response = await fetch(new Request(captureImageUrl(detail.id, c.id)));
      if (!response.ok) throw new Error("Foto nicht verfügbar");
      return response.blob();
    }),
  );
}

function useReportInput(detail: AnalysisDetail, tools: ToolResult[]): ReportInput {
  const trades = useTrades();
  const tradeLabel = trades.data?.find((t) => t.id === detail.result.trade)?.label ?? detail.result.trade;
  return { result: detail.result, createdAt: detail.created_at, note: detail.note, tradeLabel, tools };
}

/** V2: „Als PDF exportieren“ und „Lokal speichern“ direkt nach der Diagnose. */
export function ExportButtons({
  detail,
  tools,
  photos,
  canSaveLocally = true,
}: {
  detail: AnalysisDetail;
  tools: ToolResult[];
  photos: PhotoSource;
  canSaveLocally?: boolean;
}) {
  const input = useReportInput(detail, tools);
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Was zuletzt gesichert wurde: Kommen danach Werkzeug-Ergebnisse dazu, zeigt der Knopf
  // wieder „Lokal speichern“, damit die neue Fassung gesichert werden kann.
  const signature = `${detail.id}|${tools.map((t) => `${t.tool_id}:${t.text?.length ?? 0}:${t.materials?.length ?? 0}`).join(",")}`;
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const shownState = saveState === "saved" && savedSignature !== signature ? "idle" : saveState;
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function exportPdf() {
    setPdfError(null);
    const urls =
      photos.kind === "local"
        ? await Promise.all(photos.photos.map(blobToDataUrl))
        : detail.captures.map((c) => new URL(captureImageUrl(detail.id, c.id), window.location.href).toString());
    if (!openPrintWindow(buildPrintHtml(input, urls))) {
      setPdfError("Das Druckfenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben.");
    }
  }

  async function saveLocally() {
    setSaveState("saving");
    try {
      const blobs = await loadPhotoBlobs(detail, photos);
      await saveLocalAnalysis({ id: detail.id, detail, tools, photos: blobs });
      setSavedSignature(signature);
      setSaveState("saved");
      // Verlauf „Lokal“ und geöffnete lokale Analysen sofort aktualisieren
      await queryClient.invalidateQueries({ queryKey: ["local-analyses"] });
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void exportPdf()}
        className="btn-accent flex items-center justify-center px-4 py-2"
      >
        <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
        Als PDF exportieren
      </button>
      {canSaveLocally && (
        <button
          type="button"
          onClick={() => void saveLocally()}
          disabled={shownState === "saving"}
          title="Analyse inkl. Bilder nur auf diesem Gerät speichern (kein Upload)"
          className="btn-secondary flex items-center justify-center px-4 py-2"
        >
          {shownState === "saving" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : shownState === "saved" ? (
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" aria-hidden="true" />
          ) : shownState === "error" ? (
            <AlertTriangle className="mr-2 h-4 w-4 text-red-600" aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          {shownState === "saved" ? "Gespeichert!" : shownState === "error" ? "Fehler beim Speichern" : "Lokal speichern"}
        </button>
      )}
      {pdfError && (
        <p role="alert" className="text-sm text-red-700">
          {pdfError}
        </p>
      )}
    </div>
  );
}

/** V2: „Teilen“-Knopf am Ende des Ergebnisses. */
export function ShareButton({
  detail,
  tools,
  photos,
}: {
  detail: AnalysisDetail;
  tools: ToolResult[];
  photos: PhotoSource;
}) {
  const input = useReportInput(detail, tools);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-end">
      <button type="button" onClick={() => setOpen(true)} className="btn-dark flex items-center px-4 py-2">
        <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
        Teilen
      </button>
      {open && (
        <ShareModal
          text={buildShareText(input)}
          loadPhotos={async () =>
            (await loadPhotoBlobs(detail, photos)).map(
              (blob, i) => new File([blob], `smartcraft-foto-${i + 1}.jpg`, { type: blob.type || "image/jpeg" }),
            )
          }
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
