import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

const KEY = "smartcraft.disclaimerHidden";

function hiddenThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Haftungsausschluss wie V2 (EU AI Act) – pro Sitzung wegklickbar. */
export function Disclaimer() {
  const [hidden, setHidden] = useState(hiddenThisSession);
  if (hidden) return null;
  function hide() {
    setHidden(true);
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch {
      // nur Komfort
    }
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-100 p-3 text-red-700 shadow-md print:hidden">
      <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
      <div className="grow">
        <p className="font-bold">WICHTIGER HAFTUNGSAUSSCHLUSS (EU AI ACT)</p>
        <p className="text-xs">
          Die KI-Diagnose ist ein unterstützender Vorschlag und ersetzt keine professionelle Planung oder
          statische Bewertung. Führen Sie sicherheitsrelevante Arbeiten nur nach Prüfung durch einen
          zertifizierten Fachmann aus. Die KI erteilt keine Sicherheitsfreigabe.
        </p>
      </div>
      <button
        type="button"
        onClick={hide}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
        title="Hinweis ausblenden"
        aria-label="Hinweis ausblenden"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
