import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, apiBaseUrl, describeError, unwrap } from "../../api/client";
import type { AnalysisDetail, Trade } from "../../api/types";
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

export function useAnalysis(analysisId: string) {
  return useQuery({
    queryKey: analysisKeys.detail(analysisId),
    queryFn: async () =>
      unwrap(
        await api.GET("/analyses/{analysis_id}", { params: { path: { analysis_id: analysisId } } }),
      ),
  });
}

export function useOverlay(analysisId: string) {
  return useQuery({
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

export type NewAnalysis = { trade: Trade; note: string; photos: Blob[] };

export async function uploadAnalysis(projectId: string, data: NewAnalysis): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("trade", data.trade);
  if (data.note.trim()) form.append("note", data.note.trim());
  data.photos.forEach((photo, i) => form.append("files", photo, `foto-${i + 1}.jpg`));
  const response = await globalThis.fetch(
    new Request(`${apiBaseUrl}/projects/${encodeURIComponent(projectId)}/analyses`, {
      method: "POST",
      body: form,
    }),
  );
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new ApiError(response.status, describeError(body, response.status));
  return body as AnalysisDetail;
}

export function useCreateAnalysis(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NewAnalysis) => uploadAnalysis(projectId, data),
    onSuccess: (detail) => {
      queryClient.setQueryData(analysisKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: projectKeys.analyses(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
