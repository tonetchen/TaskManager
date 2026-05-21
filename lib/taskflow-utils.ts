import { Task, TaskPriority, TaskStatus } from "./types";

/** 原型 UI 使用 progress/review，API 使用 in_progress/in_review */
export type UiStatus = "todo" | "progress" | "review" | "done";

export const UI_STATUS_MAP: Record<UiStatus, TaskStatus> = {
  todo: "todo",
  progress: "in_progress",
  review: "in_review",
  done: "done",
};

export const API_TO_UI_STATUS: Record<TaskStatus, UiStatus> = {
  todo: "todo",
  in_progress: "progress",
  in_review: "review",
  done: "done",
};

export const STATUS_LABELS: Record<UiStatus, string> = {
  todo: "待开始",
  progress: "进行中",
  review: "审核中",
  done: "已完成",
};

export const STATUS_CLASS: Record<UiStatus, string> = {
  todo: "status-todo",
  progress: "status-progress",
  review: "status-review",
  done: "status-done",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

const AVATAR_COLORS = [
  "var(--accent)",
  "var(--info)",
  "var(--warning)",
  "var(--success)",
  "#9fbbe0",
];

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function avatarInitial(name: string): string {
  return name.trim().charAt(0) || "?";
}

export function formatTaskId(id: number): string {
  return `TASK-${String(id).padStart(3, "0")}`;
}

export function formatTaskHash(id: number): string {
  return `#${String(id).padStart(3, "0")}`;
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  return d;
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function countSubtasksDone(task: Task): { done: number; total: number } {
  const subs = task.subtasks ?? [];
  return {
    done: subs.filter((s) => s.status === "done").length,
    total: subs.length,
  };
}

export function uiStatusOf(task: Task): UiStatus {
  return API_TO_UI_STATUS[task.status];
}
