export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Unbekannter Fehler.";
  return (
    <p role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}
