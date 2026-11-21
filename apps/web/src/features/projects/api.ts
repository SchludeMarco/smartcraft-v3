import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";
import type { ProjectCreate } from "../../api/types";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
  analyses: (id: string) => ["projects", id, "analyses"] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => unwrap(await api.GET("/projects")),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () =>
      unwrap(await api.GET("/projects/{project_id}", { params: { path: { project_id: projectId } } })),
  });
}

export function useProjectAnalyses(projectId: string) {
  return useQuery({
    queryKey: projectKeys.analyses(projectId),
    queryFn: async () =>
      unwrap(
        await api.GET("/projects/{project_id}/analyses", {
          params: { path: { project_id: projectId } },
        }),
      ),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProjectCreate) => unwrap(await api.POST("/projects", { body: data })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
