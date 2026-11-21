import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Basis-URL: im Browser "/api" (Vite-Proxy bzw. Reverse-Proxy), überschreibbar per VITE_API_BASE.
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE ?? `${window.location.origin}/api`;

export const api = createClient<paths>({
  baseUrl: apiBaseUrl,
  // Wrapper statt Referenz, damit Tests globalThis.fetch austauschen können.
  fetch: (request) => globalThis.fetch(request),
});

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Liefert die Daten oder wirft einen ApiError mit lesbarer Meldung. */
export function unwrap<T>({ data, error, response }: FetchResult<T>): T {
  if (error !== undefined || data === undefined) {
    throw new ApiError(response.status, describeError(error, response.status));
  }
  return data;
}

export function describeError(error: unknown, status: number): string {
  if (error && typeof error === "object" && "detail" in error) {
    const detail = (error as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String(d.msg) : String(d)))
        .join(" · ");
    }
  }
  if (status === 429) return "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.";
  if (status === 413) return "Die Fotos sind zusammen zu groß. Bitte weniger Fotos auswählen.";
  if (status === 0 || status >= 500) return "Server nicht erreichbar oder Fehler im Server.";
  return `Anfrage fehlgeschlagen (${status}).`;
}
