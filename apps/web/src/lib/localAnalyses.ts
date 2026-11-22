import type { AnalysisDetail, ToolResult } from "../api/types";

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

const DB_NAME = "smartcraft-v3";
const STORE = "analyses";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Lokaler Speicher wird von diesem Browser nicht unterstützt."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicher nicht verfügbar."));
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Lokaler Speicher: Fehler."));
    });
  } finally {
    db.close();
  }
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
