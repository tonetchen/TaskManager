/**
 * 前端 API 客户端 — UI 层与数据解耦，OpenDesign 原型接入时直接复用。
 */
import {
  CreateTaskInput,
  MemberRole,
  Task,
  TaskActivityLog,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
  Project,
  WorkspaceMember,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data as T;
}

export const api = {
  getTasks(filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: number;
    view?: "list" | "board";
    projectId?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.assigneeId) params.set("assigneeId", String(filters.assigneeId));
    if (filters?.view) params.set("view", filters.view);
    if (filters?.projectId) params.set("projectId", String(filters.projectId));
    const qs = params.toString();
    return request<{ tasks: Task[]; role?: MemberRole }>(
      `/api/tasks${qs ? `?${qs}` : ""}`
    );
  },

  createTask(input: CreateTaskInput) {
    return request<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  getTask(id: number) {
    return request<{ task: Task; logs: TaskActivityLog[] }>(`/api/tasks/${id}`);
  },

  updateTask(id: number, input: UpdateTaskInput) {
    return request<{ task: Task }>(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  reorderKanban(taskId: number, status: TaskStatus, index: number) {
    return request<{ task: Task }>("/api/tasks/kanban-reorder", {
      method: "PATCH",
      body: JSON.stringify({ taskId, status, index }),
    });
  },

  deleteTask(id: number) {
    return request<{ success: boolean }>(`/api/tasks/${id}`, { method: "DELETE" });
  },

  batchUpdateStatus(taskIds: number[], status: TaskStatus) {
    return request<{ tasks: Task[] }>("/api/tasks/batch-status", {
      method: "PATCH",
      body: JSON.stringify({ taskIds, status }),
    });
  },

  getMembers() {
    return request<{ members: WorkspaceMember[]; role: MemberRole }>("/api/members");
  },

  getProjects() {
    return request<{ projects: Project[] }>("/api/projects");
  },

  inviteMember(username: string, role: MemberRole) {
    return request<{ member: WorkspaceMember }>("/api/members", {
      method: "POST",
      body: JSON.stringify({ username, role }),
    });
  },

  changeMemberRole(userId: number, role: MemberRole) {
    return request<{ member: WorkspaceMember }>("/api/members", {
      method: "PATCH",
      body: JSON.stringify({ userId, role }),
    });
  },
};
