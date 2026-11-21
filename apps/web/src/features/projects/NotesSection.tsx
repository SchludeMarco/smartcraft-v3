import { useState, type FormEvent } from "react";
import { ErrorMessage } from "../../components/ErrorMessage";
import { formatDateTime } from "../../lib/format";
import { NAME_KEY, loadValue } from "../../lib/storage";
import { useCreateNote, useDeleteNote, useNotes } from "./api";

export function NotesSection({ projectId }: { projectId: string }) {
  const notes = useNotes(projectId);
  const create = useCreateNote(projectId);
  const remove = useDeleteNote(projectId);
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    create.mutate(
      { text, author: loadValue(NAME_KEY) || null },
      { onSuccess: () => setText("") },
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Notizen</h2>
      <form onSubmit={submit} className="space-y-2">
        <label className="block">
          <span className="sr-only">Neue Notiz</span>
          <textarea
            className="w-full rounded border border-stone-300 bg-white px-3 py-2"
            rows={2}
            maxLength={2000}
            placeholder="z. B. Kunde informiert, Material bestellt …"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={create.isPending || !text.trim()}
          className="rounded bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Notiz speichern
        </button>
      </form>
      {(create.isError || remove.isError) && <ErrorMessage error={create.error ?? remove.error} />}
      <ul className="space-y-2">
        {notes.data?.map((note) => (
          <li key={note.id} className="rounded bg-white p-3 text-sm shadow-sm">
            <p className="whitespace-pre-line">{note.text}</p>
            <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
              <span>
                {formatDateTime(note.created_at)}
                {note.author && ` · ${note.author}`}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(note.id)}
                className="text-red-700 underline"
                aria-label={`Notiz vom ${formatDateTime(note.created_at)} löschen`}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
