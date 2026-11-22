import changelogText from "virtual:changelog";

/** Ein Eintrag des Änderungsprotokolls (CHANGELOG.md im Repo-Wurzelverzeichnis). */
export interface ChangelogEntry {
  version: string;
  /** Zeitstempel wie im CHANGELOG: „JJJJ-MM-TT HH:MM“ (deutsche Zeit). */
  timestamp: string;
  /** Inhalt als einfaches Markdown (Unterüberschriften, Listen, fett). */
  body: string;
}

const HEADING = /^## \[([^\]]+)\] – (\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?\s*$/;

/**
 * Zerlegt die CHANGELOG.md in Einträge. Umgebrochene Listenpunkte werden zu einer Zeile
 * zusammengefügt, Code-Markierungen (`…`) entfernt – für die Anzeige in der App.
 */
export function parseChangelog(text: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: { version: string; timestamp: string; lines: string[] } | null = null;

  const finish = () => {
    if (current) {
      entries.push({
        version: current.version,
        timestamp: current.timestamp,
        body: current.lines.join("\n").trim(),
      });
    }
  };

  for (const raw of text.split("\n")) {
    const heading = HEADING.exec(raw);
    if (heading) {
      finish();
      const [, version = "", date = "", time] = heading;
      current = { version, timestamp: time ? `${date} ${time}` : date, lines: [] };
      continue;
    }
    if (!current) continue;
    const line = raw.replace(/`([^`]*)`/g, "$1");
    const last = current.lines.length - 1;
    const isContinuation = /^\s{2,}\S/.test(line) && last >= 0 && current.lines[last] !== "";
    if (isContinuation) {
      current.lines[last] = `${current.lines[last] ?? ""} ${line.trim()}`;
    } else {
      current.lines.push(line.trimEnd());
    }
  }
  finish();
  return entries;
}

/** „2026-11-22 14:08“ → „22.11.2026, 14:08 Uhr“ */
export function formatTimestamp(timestamp: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?$/.exec(timestamp);
  if (!match) return timestamp;
  const [, year, month, day, time] = match;
  const date = `${day}.${month}.${year}`;
  return time ? `${date}, ${time} Uhr` : date;
}

export const CHANGELOG: ChangelogEntry[] = parseChangelog(changelogText);
export const APP_VERSION: string = CHANGELOG[0]?.version ?? "";
