import type { AnalysisDetail, ToolResult } from "../api/types";
import { STORES, withStore } from "./db";

/**
 * „Lokal speichern“ wie V2: Analyse inkl. Fotos und Werkzeug-Ergebnissen nur auf diesem
 * Gerät (IndexedDB, kein Upload). Bleibt erhalten, auch wenn der Demo-Server neu startet.
 */
export type LocalAnalysis = {
  id: string;
  savedAt: string;
  detail: AnalysisDetail;
  tools: ToolResult[];
  photos: Blob[];
};

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return withStore(STORES.analyses, mode, action);
}

export async function saveLocalAnalysis(entry: Omit<LocalAnalysis, "savedAt">): Promise<LocalAnalysis> {
  const full: LocalAnalysis = { ...entry, savedAt: new Date().toISOString() };
  await run("readwrite", (store) => store.put(full));
  return full;
}

export async function listLocalAnalyses(): Promise<LocalAnalysis[]> {
  const all = await run<LocalAnalysis[]>("readonly", (store) => store.getAll() as IDBRequest<LocalAnalysis[]>);
  return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getLocalAnalysis(id: string): Promise<LocalAnalysis | undefined> {
  return run<LocalAnalysis | undefined>("readonly", (store) => store.get(id) as IDBRequest<LocalAnalysis | undefined>);
}

export async function deleteLocalAnalysis(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
