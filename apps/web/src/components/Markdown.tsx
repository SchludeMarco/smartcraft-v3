import type { ReactNode } from "react";

/** **fett** innerhalb einer Zeile – ohne HTML aus der KI-Antwort zu übernehmen. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

/**
 * Kleiner, sicherer Markdown-Renderer für KI-Antworten (Überschriften, Listen, fett).
 * Bewusst kein dangerouslySetInnerHTML: Modellausgaben sind nicht vertrauenswürdig.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)?.[1] ?? "");
      continue;
    }
    flush();
    if (!line) continue;
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="font-bold text-gray-800">
          {inline(heading[1] ?? "")}
        </p>,
      );
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}
