import { Clock, History } from "lucide-react";
import { Link } from "react-router";
import { Markdown } from "../../components/Markdown";
import { CHANGELOG, formatTimestamp } from "./changelog";

/** Änderungsprotokoll der App – alle Änderungen mit Zeitstempel, neueste zuerst. */
export function ChangelogPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-6 w-6 text-(--accent)" aria-hidden="true" />
        <h1 className="text-xl font-bold tracking-tight">Änderungsprotokoll</h1>
      </div>
      <p className="text-sm text-gray-600">
        Alle Änderungen an Sm@rtCraft 3.0 mit Datum und Uhrzeit der Veröffentlichung,
        neueste zuerst. Die Geschichte von V2 bis heute steht in der README des Projekts.
      </p>
      <ol className="space-y-3" aria-label="Versionen">
        {CHANGELOG.map((entry, index) => (
          <li key={entry.version}>
            <details
              open={index === 0}
              className="rounded-xl border border-(--accent-soft) bg-white/70 p-3 shadow-sm"
            >
              <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                <span className="badge-pill bg-(--accent) px-2 py-0.5 text-xs font-bold text-white">
                  Version {entry.version}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={entry.timestamp.replace(" ", "T")}>
                    {formatTimestamp(entry.timestamp)}
                  </time>
                </span>
              </summary>
              <div className="mt-3 text-sm text-gray-700">
                <Markdown text={entry.body} />
              </div>
            </details>
          </li>
        ))}
      </ol>
      <Link to="/" className="inline-block font-semibold text-(--accent) underline">
        Zur Projektübersicht
      </Link>
    </div>
  );
}
