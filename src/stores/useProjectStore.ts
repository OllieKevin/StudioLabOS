import { create } from "zustand";
import type { ProjectFullView, ProjectRow } from "../lib/types/project";
import { fetchProjectFullView, fetchProjects } from "../services/projectService";

type State = {
  projects: ProjectRow[];
  selectedId?: string;
  detail?: ProjectFullView;
  isLoading: boolean;
  error?: string;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => Promise<void>;
};

export const useProjectStore = create<State>((set, get) => ({
  projects: [],
  selectedId: undefined,
  detail: undefined,
  isLoading: false,
  error: undefined,

  async loadProjects() {
    set({ isLoading: true, error: undefined });
    try {
      const projects = await fetchProjects();
      const selectedId = get().selectedId ?? projects[0]?.id;
      set({ projects, selectedId, isLoading: false });

      if (selectedId) {
        await get().selectProject(selectedId);
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "项目加载失败"
      });
    }
  },

  async selectProject(id: string) {
    set({ selectedId: id, isLoading: true, error: undefined });
    try {
      const knownProject = get().projects.find((item) => item.id === id);
      const detail = await fetchProjectFullView(id, knownProject);
      set({ detail, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "项目详情加载失败"
      });
    }
  }
}));
