import { useState, type FormEvent } from "react";
import type { Project, ProjectCreate } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { useCreateProject } from "./api";

type Props = {
  onCreated: (project: Project) => void;
  onCancel: () => void;
};

const inputClass =
  "w-full rounded border border-stone-300 bg-white px-3 py-2 text-base focus:border-amber-600 focus:outline-none";

export function ProjectForm({ onCreated, onCancel }: Props) {
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Bitte einen Projektnamen eingeben.");
      return;
    }
    setNameError(null);
    const data: ProjectCreate = {
      name: name.trim(),
      address: address.trim() || null,
      client: client.trim() || null,
      description: description.trim() || null,
    };
    create.mutate(data, { onSuccess: onCreated });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Neues Projekt</h2>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Projektname *</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          aria-invalid={nameError ? true : undefined}
          autoFocus
        />
        {nameError && <span className="text-sm text-red-700">{nameError}</span>}
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Adresse</span>
        <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Auftraggeber</span>
        <input className={inputClass} value={client} onChange={(e) => setClient(e.target.value)} maxLength={200} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Beschreibung</span>
        <textarea
          className={inputClass}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </label>
      {create.isError && <ErrorMessage error={create.error} />}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={create.isPending}
          className="flex-1 rounded bg-amber-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {create.isPending ? "Wird angelegt …" : "Projekt anlegen"}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-stone-300 px-4 py-3">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
