import type { Trade } from "../api/types";
import { STORES, withStore } from "./db";

/**
 * Offline-Warteschlange wie V2: Ohne Empfang wird eine Analyse auf dem Gerät gespeichert
 * und automatisch durchgeführt, sobald wieder eine Verbindung besteht.
 */
export type QueuedAnalysis = {
  id: string;
  createdAt: string;
  trade: Trade;
  note: string;
  photos: Blob[];
  projectId: string | null;
};

const listeners = new Set<() => void>();
export function onQueueChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function changed() {
  listeners.forEach((l) => l());
}

export async function queueAnalysis(entry: Omit<QueuedAnalysis, "id" | "createdAt">): Promise<QueuedAnalysis> {
  const full: QueuedAnalysis = {
    ...entry,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await withStore(STORES.queue, "readwrite", (store) => store.put(full));
  changed();
  return full;
}

export async function listQueued(): Promise<QueuedAnalysis[]> {
  const all = await withStore<QueuedAnalysis[]>(
    STORES.queue,
    "readonly",
    (store) => store.getAll() as IDBRequest<QueuedAnalysis[]>,
  );
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueued(id: string): Promise<void> {
  await withStore(STORES.queue, "readwrite", (store) => store.delete(id));
  changed();
}
