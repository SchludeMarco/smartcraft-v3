/**
 * Verkleinert ein Foto im Browser und kodiert es neu als JPEG.
 *
 * - Hält Uploads klein (Vercel nimmt pro Anfrage höchstens 4,5 MB an).
 * - Neu-Kodierung über Canvas verwirft EXIF-Daten inkl. GPS schon auf dem Gerät.
 *   Das Backend bereinigt zusätzlich noch einmal (ADR 0005).
 */
export async function resizeImage(file: Blob, maxEdge = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bild konnte nicht verarbeitet werden.");
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Bild konnte nicht verarbeitet werden."))),
        "image/jpeg",
        quality,
      ),
    );
  } finally {
    bitmap.close();
  }
}

/** Gesamtgröße, ab der ein Upload sicher unter dem Vercel-Limit bleibt. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
