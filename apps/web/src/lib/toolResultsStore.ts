import { useSyncExternalStore } from "react";
import type { ToolResult } from "../api/types";

/**
 * Ergebnisse der KI-Werkzeuge im Browser (wie V2 nur in der Sitzung), damit PDF-Export,
 * Teilen und Lokal speichern sie mitnehmen können.
 * Schlüssel: Analyse-ID für die allgemeinen Werkzeuge, "spezial" für Berufs-Spezial-Tools.
 */
type State = Record<string, ToolResult[]>;

let state: State = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const SPECIAL_SCOPE = "spezial";

export const toolResults = {
  get(scope: string): ToolResult[] {
    return state[scope] ?? [];
  },
  put(scope: string, result: ToolResult) {
    const others = (state[scope] ?? []).filter((r) => r.tool_id !== result.tool_id);
    state = { ...state, [scope]: [result, ...others] };
    emit();
  },
  remove(scope: string, toolId: string) {
    state = { ...state, [scope]: (state[scope] ?? []).filter((r) => r.tool_id !== toolId) };
    emit();
  },
  clear(scope: string) {
    state = { ...state, [scope]: [] };
    emit();
  },
  reset() {
    state = {};
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const EMPTY: ToolResult[] = [];

export function useToolResults(scope: string): ToolResult[] {
  return useSyncExternalStore(
    toolResults.subscribe,
    () => state[scope] ?? EMPTY,
    () => EMPTY,
  );
}
