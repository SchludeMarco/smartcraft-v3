import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, apiBaseUrl, describeError, unwrap } from "../../api/client";
import type { AnalysisDetail, CheckUpdate, Trade } from "../../api/types";
import { projectKeys } from "../projects/api";

export const analysisKeys = {
  detail: (id: string) => ["analyses", id] as const,
  overlay: (id: string) => ["analyses", id, "overlay"] as const,
};

export function useTrades() {
  return useQuery({
    queryKey: ["meta", "trades"],
    queryFn: async () => unwrap(await api.GET("/meta/trades")),
    staleTime: Infinity,
  });
}

export function useAnalysis(analysisId: string, enabled = true) {
  return useQuery({
    enabled: enabled && analysisId !== "",
    queryKey: analysisKeys.detail(analysisId),
    queryFn: async () =>
      unwrap(
        await api.GET("/analyses/{analysis_id}", { params: { path: { analysis_id: analysisId } } }),
      ),
  });
}

export function useOverlay(analysisId: string) {
  return useQuery({
    enabled: analysisId !== "",
    queryKey: analysisKeys.overlay(analysisId),
    queryFn: async () =>
      unwrap(
        await api.GET("/analyses/{analysis_id}/overlay", {
          params: { path: { analysis_id: analysisId } },
        }),
      ),
  });
}

export function captureImageUrl(analysisId: string, captureId: string): string {
  return `${apiBaseUrl}/analyses/${encodeURIComponent(analysisId)}/captures/${encodeURIComponent(captureId)}/image`;
}

/** Verlauf wie V2: die letzten Analysen auf dem Server. */
export function useRecentAnalyses(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["analyses", "recent"],
    queryFn: async () => unwrap(await api.GET("/analyses", { params: { query: { limit: 20 } } })),
  });
}

/** Wie V2: Foto(s) und/oder Beschreibung; Projekt optional. */
export type NewAnalysis = { trade: Trade; note: string; photos: Blob[]; projectId?: string | null };

export async function uploadAnalysis(data: NewAnalysis): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("trade", data.trade);
  if (data.note.trim()) form.append("note", data.note.trim());
  data.photos.forEach((photo, i) => form.append("files", photo, `foto-${i + 1}.jpg`));
  const url = data.projectId
    ? `${apiBaseUrl}/projects/${encodeURIComponent(data.projectId)}/analyses`
    : `${apiBaseUrl}/analyses`;
  const response = await globalThis.fetch(new Request(url, { method: "POST", body: form }));
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, describeError(body, response.status));
  return body as AnalysisDetail;
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadAnalysis,
    onSuccess: (detail) => {
      queryClient.setQueryData(analysisKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: ["analyses"] });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Analyse einem Projekt zuordnen (oder mit `null` lösen). */
export function useAssignProject(analysisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string | null) =>
      unwrap(
        await api.PATCH("/analyses/{analysis_id}", {
          params: { path: { analysis_id: analysisId } },
          body: { project_id: projectId },
        }),
      ),
    onSuccess: (detail) => {
      queryClient.setQueryData(analysisKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateCheck(analysisId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ checkId, update }: { checkId: string; update: CheckUpdate }) =>
      unwrap(
        await api.PATCH("/analyses/{analysis_id}/checks/{check_id}", {
          params: { path: { analysis_id: analysisId, check_id: checkId } },
          body: update,
        }),
      ),
    onSuccess: (check) => {
      queryClient.setQueryData<AnalysisDetail>(analysisKeys.detail(analysisId), (old) =>
        old ? { ...old, checks: old.checks.map((c) => (c.id === check.id ? check : c)) } : old,
      );
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
