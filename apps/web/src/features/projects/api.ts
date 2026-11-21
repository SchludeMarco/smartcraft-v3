import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../../api/client";
import type { NoteCreate, ProjectCreate } from "../../api/types";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (id: string) => ["projects", id] as const,
  analyses: (id: string) => ["projects", id, "analyses"] as const,
  notes: (id: string) => ["projects", id, "notes"] as const,
  report: (id: string) => ["projects", id, "report"] as const,
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

export function useNotes(projectId: string) {
  return useQuery({
    queryKey: projectKeys.notes(projectId),
    queryFn: async () =>
      unwrap(await api.GET("/projects/{project_id}/notes", { params: { path: { project_id: projectId } } })),
  });
}

export function useCreateNote(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NoteCreate) =>
      unwrap(
        await api.POST("/projects/{project_id}/notes", {
          params: { path: { project_id: projectId } },
          body: data,
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.notes(projectId) }),
  });
}

export function useDeleteNote(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error, response } = await api.DELETE("/projects/{project_id}/notes/{note_id}", {
        params: { path: { project_id: projectId, note_id: noteId } },
      });
      if (error !== undefined || !response.ok) unwrap({ error: error ?? {}, response });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.notes(projectId) }),
  });
}

export function useProjectReport(projectId: string) {
  return useQuery({
    queryKey: projectKeys.report(projectId),
    queryFn: async () =>
      unwrap(await api.GET("/projects/{project_id}/report", { params: { path: { project_id: projectId } } })),
    staleTime: 0,
  });
}
