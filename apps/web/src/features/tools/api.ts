import { useMutation, useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";
import type { Trade } from "../../api/types";

export function useTools() {
  return useQuery({
    queryKey: ["tools"],
    queryFn: async () => unwrap(await api.GET("/tools")),
    staleTime: Infinity,
  });
}

export type ToolCall = {
  toolId: string;
  trade: Trade;
  analysisId?: string | null;
  note?: string | null;
};

export function useRunTool() {
  return useMutation({
    mutationFn: async ({ toolId, trade, analysisId, note }: ToolCall) =>
      unwrap(
        await api.POST("/tools/{tool_id}", {
          params: { path: { tool_id: toolId } },
          body: { trade, analysis_id: analysisId ?? null, note: note?.trim() || null },
        }),
      ),
  });
}
