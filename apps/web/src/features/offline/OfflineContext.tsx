import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../../api/client";
import { celebrateCompletion } from "../../lib/celebrate";
import {
  listQueued,
  onQueueChange,
  removeQueued,
  type QueuedAnalysis,
} from "../../lib/offlineQueue";
import { useOnline } from "../../lib/useOnline";
import { uploadAnalysis } from "../analysis/api";

type OfflineState = {
  online: boolean;
  pending: QueuedAnalysis[];
  syncing: boolean;
  feedback: string | null;
  dismissFeedback: () => void;
};

const Ctx = createContext<OfflineState | null>(null);

/** Holt gespeicherte Offline-Analysen automatisch nach, sobald wieder Empfang da ist (wie V2). */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const online = useOnline();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<QueuedAnalysis[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const running = useRef(false);

  const refresh = useCallback(() => {
    listQueued()
      .then(setPending)
      .catch(() => setPending([]));
  }, []);

  useEffect(() => {
    refresh();
    return onQueueChange(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!online || pending.length === 0 || running.current) return;
    running.current = true;
    setSyncing(true);
    void (async () => {
      let done = 0;
      for (const entry of pending) {
        try {
          await uploadAnalysis({
            trade: entry.trade,
            note: entry.note,
            photos: entry.photos,
            projectId: entry.projectId,
          });
          await removeQueued(entry.id);
          done += 1;
        } catch (error) {
          // Ungültige Eingaben würden nie gelingen → entfernen; Netz-/Serverfehler → später erneut
          if (error instanceof ApiError && error.status === 422)
            await removeQueued(entry.id);
          else break;
        }
      }
      running.current = false;
      setSyncing(false);
      if (done > 0) {
        celebrateCompletion();
        void queryClient.invalidateQueries({ queryKey: ["analyses"] });
        setFeedback(
          done === 1
            ? "Ihre gespeicherte Offline-Analyse wurde durchgeführt. Sie finden das Ergebnis im Verlauf."
            : `${done} gespeicherte Offline-Analysen wurden durchgeführt. Sie finden die Ergebnisse im Verlauf.`,
        );
      }
    })();
  }, [online, pending, queryClient]);

  const value = useMemo(
    () => ({
      online,
      pending,
      syncing,
      feedback,
      dismissFeedback: () => setFeedback(null),
    }),
    [online, pending, syncing, feedback],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const value = useContext(Ctx);
  if (!value) throw new Error("OfflineProvider fehlt");
  return value;
}
