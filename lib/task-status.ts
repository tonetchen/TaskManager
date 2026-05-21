import { TaskStatus } from "./types";

/** 合法状态流转：todo → in_progress → in_review → done，审核可驳回 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["in_review", "todo"],
  in_review: ["done", "in_progress"],
  done: ["in_review"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_TRANSITION: ${from} -> ${to}`);
  }
}

export const ALL_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "done",
];
