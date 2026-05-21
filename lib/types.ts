export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type MemberRole = "admin" | "member" | "observer";

export interface User {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: number;
  name: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  workspace_id: number;
  name: string;
  task_count?: number;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: MemberRole;
  created_at: Date;
  updated_at: Date;
  username?: string;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Task {
  id: number;
  workspace_id: number;
  project_id?: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  board_order: number;
  due_date: string | null;
  assignee_id: number | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  assignee_username?: string | null;
  subtasks?: Task[];
}

export interface TaskActivityLog {
  id: number;
  task_id: number;
  user_id: number;
  action: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  detail: string | null;
  created_at: Date;
  username?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  assigneeId?: number | null;
  parentId?: number | null;
  projectId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string | null;
  assigneeId?: number | null;
}

export interface KanbanReorderInput {
  taskId: number;
  status: TaskStatus;
  index: number;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "待开始",
  in_progress: "进行中",
  in_review: "审核中",
  done: "已完成",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  admin: "管理员",
  member: "成员",
  observer: "观察者",
};
