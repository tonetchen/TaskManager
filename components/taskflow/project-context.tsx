"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Project } from "@/lib/types";

const STORAGE_KEY = "taskflow-project-id";

interface ProjectContextValue {
  projectId: number;
  project: Project | null;
  projects: Project[];
  loading: boolean;
  selectProject: (id: number) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed)) setProjectId(parsed);
    }
    setHydrated(true);
  }, []);

  const refreshProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (!res.ok) return;
    const data = await res.json();
    if (data.projects) setProjects(data.projects);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.projects?.length) return;

        setProjects(data.projects);
        setProjectId((current) => {
          const exists = data.projects.some((p: Project) => p.id === current);
          if (exists) return current;
          const fallback = data.projects[0].id as number;
          localStorage.setItem(STORAGE_KEY, String(fallback));
          return fallback;
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const selectProject = useCallback((id: number) => {
    setProjectId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const value = useMemo(
    () => ({
      projectId,
      project,
      projects,
      loading,
      selectProject,
      refreshProjects,
    }),
    [projectId, project, projects, loading, selectProject, refreshProjects]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}
