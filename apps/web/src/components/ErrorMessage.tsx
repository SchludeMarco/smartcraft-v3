import { AlertTriangle } from "lucide-react";

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
  return (
    <p
      role="alert"
      className="flex gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
