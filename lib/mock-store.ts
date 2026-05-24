import {
  buildInitialMembers,
  buildInitialTasks,
  buildSampleLogs,
  getMockProjectById,
  MOCK_PROJECTS,
} from "./mock-data";
import { MOCK_WORKSPACE_ID } from "./mock-mode";
import { assertTransition } from "./task-status";
import { assertTaskTitleAndAssignee } from "./task-form-validation";
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

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  parentId?: number | null;
  projectId?: number;
}

class MockStore {
  private tasks: Task[];
  private members: WorkspaceMember[];
  private logs: TaskActivityLog[];
  private nextTaskId: number;
  private nextMemberId: number;
  private nextLogId: number;

  constructor() {
    this.tasks = buildInitialTasks();
    this.members = buildInitialMembers();
    this.logs = [];
    this.nextTaskId = Math.max(...this.tasks.map((t) => t.id), 0) + 1;
    this.nextMemberId = this.members.length + 1;
    this.nextLogId = 1;
  }

  listMembers(workspaceId: number): WorkspaceMember[] {
    void workspaceId;
    return [...this.members];
  }

  listProjects(_workspaceId: number): Project[] {
    return MOCK_PROJECTS.map((project) => ({
      ...project,
      task_count: this.tasks.filter(
        (t) => t.project_id === project.id && t.parent_id === null
      ).length,
    }));
  }

  getProjectById(projectId: number): Project | null {
    const project = getMockProjectById(projectId);
    if (!project) return null;
    return {
      ...project,
      task_count: this.tasks.filter(
        (t) => t.project_id === project.id && t.parent_id === null
      ).length,
    };
  }

  inviteMember(username: string, role: MemberRole): WorkspaceMember {
    const member: WorkspaceMember = {
      id: this.nextMemberId++,
      workspace_id: MOCK_WORKSPACE_ID,
      user_id: 900_000 + this.nextMemberId,
      role,
      username,
      email: `${username}@mock.local`,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.members.push(member);
    return member;
  }

  changeMemberRole(userId: number, role: MemberRole): WorkspaceMember {
    const member = this.members.find((m) => m.user_id === userId);
    if (!member) throw new Error("NOT_FOUND: member");
    member.role = role;
    member.updated_at = new Date();
    return { ...member };
  }

  private matchesFilters(task: Task, filters: TaskFilters): boolean {
    if (filters.projectId !== undefined && task.project_id !== filters.projectId) {
      return false;
    }
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assigneeId && task.assignee_id !== filters.assigneeId) return false;
    if (filters.parentId !== undefined && task.parent_id !== filters.parentId) return false;
    return true;
  }

  listTasks(_workspaceId: number, filters: TaskFilters = {}): Task[] {
    return this.tasks
      .filter((t) => this.matchesFilters(t, filters))
      .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0))
      .map((t) => ({ ...t, subtasks: undefined }));
  }

  getTasksWithSubtasks(_workspaceId: number, filters: TaskFilters = {}): Task[] {
    const roots = this.tasks
      .filter(
        (t) => t.parent_id === null && this.matchesFilters(t, { ...filters, parentId: null })
      )
      .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0));
    return roots.map((root) => ({
      ...root,
      subtasks: this.tasks.filter((t) => t.parent_id === root.id),
    }));
  }

  getTaskById(taskId: number): Task | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const subtasks = this.tasks.filter((t) => t.parent_id === taskId);
    return { ...task, subtasks: subtasks.length ? subtasks : undefined };
  }

  listActivityLogs(taskId: number): TaskActivityLog[] {
    const stored = this.logs.filter((l) => l.task_id === taskId);
    if (stored.length) return stored;
    const task = this.tasks.find((t) => t.id === taskId);
    return task ? buildSampleLogs(taskId, task.title) : [];
  }

  createTask(userId: number, input: CreateTaskInput): Task {
    assertTaskTitleAndAssignee(input.title, input.assigneeId);

    const projectId = input.projectId ?? 1;
    if (!getMockProjectById(projectId)) {
      throw new Error("NOT_FOUND: project");
    }

    if (input.parentId) {
      const parent = this.tasks.find((t) => t.id === input.parentId);
      if (!parent) throw new Error("NOT_FOUND: parent task");
      if (parent.parent_id !== null) {
        throw new Error("VALIDATION: max subtask depth exceeded");
      }
      if (parent.project_id !== projectId) {
        throw new Error("VALIDATION: parent task project mismatch");
      }
    }

    const assignee = input.assigneeId
      ? this.members.find((m) => m.user_id === input.assigneeId)
      : null;

    const status = input.status ?? "todo";
    const maxOrder = this.tasks
      .filter(
        (t) =>
          t.project_id === projectId &&
          t.parent_id === null &&
          t.status === status
      )
      .reduce((max, t) => Math.max(max, t.board_order ?? 0), -1);

    const task: Task = {
      id: this.nextTaskId++,
      workspace_id: MOCK_WORKSPACE_ID,
      project_id: projectId,
      parent_id: input.parentId ?? null,
      title: input.title.trim(),
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      status,
      board_order: input.parentId ? 0 : maxOrder + 1,
      due_date: input.dueDate ?? null,
      assignee_id: input.assigneeId ?? null,
      assignee_username: assignee?.username ?? null,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.tasks.push(task);
    this.addLog({
      taskId: task.id,
      userId,
      action: "created",
      toStatus: task.status,
      detail: `创建任务: ${task.title}`,
    });
    return { ...task };
  }

  updateTask(taskId: number, userId: number, input: UpdateTaskInput): Task {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error("NOT_FOUND: task");

    const existing = this.tasks[idx];
    const nextTitle = input.title !== undefined ? input.title : existing.title;
    const nextAssigneeId =
      input.assigneeId !== undefined ? input.assigneeId : existing.assignee_id;
    assertTaskTitleAndAssignee(nextTitle, nextAssigneeId);

    if (input.status && input.status !== existing.status) {
      assertTransition(existing.status, input.status);
    }

    const assignee = input.assigneeId
      ? this.members.find((m) => m.user_id === input.assigneeId)
      : undefined;

    const updated: Task = {
      ...existing,
      title: input.title ?? existing.title,
      description: input.description !== undefined ? input.description : existing.description,
      priority: input.priority ?? existing.priority,
      status: input.status ?? existing.status,
      due_date: input.dueDate !== undefined ? input.dueDate : existing.due_date,
      assignee_id: input.assigneeId !== undefined ? input.assigneeId : existing.assignee_id,
      assignee_username:
        assignee !== undefined ? (assignee?.username ?? null) : existing.assignee_username,
      updated_at: new Date(),
    };
    this.tasks[idx] = updated;

    if (input.status && input.status !== existing.status) {
      this.addLog({
        taskId,
        userId,
        action: "status_changed",
        fromStatus: existing.status,
        toStatus: input.status,
      });
    } else {
      this.addLog({ taskId, userId, action: "updated", detail: "更新任务信息" });
    }

    return { ...updated };
  }

  deleteTask(taskId: number, userId: number): void {
    const existing = this.tasks.find((t) => t.id === taskId);
    if (!existing) throw new Error("NOT_FOUND: task");
    this.addLog({
      taskId,
      userId,
      action: "deleted",
      fromStatus: existing.status,
      detail: `删除任务: ${existing.title}`,
    });
    this.tasks = this.tasks.filter((t) => t.id !== taskId && t.parent_id !== taskId);
  }

  batchUpdateStatus(taskIds: number[], status: TaskStatus, userId: number): Task[] {
    return taskIds.map((id) => this.updateTask(id, userId, { status }));
  }

  reorderKanban(
    taskId: number,
    userId: number,
    targetStatus: TaskStatus,
    targetIndex: number
  ): Task {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error("NOT_FOUND: task");

    const existing = this.tasks[idx];
    if (existing.parent_id !== null) {
      throw new Error("VALIDATION: only root tasks can be reordered on kanban");
    }

    const oldStatus = existing.status;
    if (targetStatus !== oldStatus) {
      assertTransition(oldStatus, targetStatus);
    }

    const projectId = existing.project_id ?? 1;

    this.tasks[idx] = {
      ...existing,
      status: targetStatus,
      updated_at: new Date(),
    };

    if (oldStatus !== targetStatus) {
      this.renumberColumn(oldStatus, projectId);
    }

    const columnTasks = this.tasks
      .filter(
        (t) =>
          t.project_id === projectId &&
          t.parent_id === null &&
          t.status === targetStatus &&
          t.id !== taskId
      )
      .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0));

    const clampedIndex = Math.max(0, Math.min(targetIndex, columnTasks.length));
    columnTasks.splice(clampedIndex, 0, this.tasks[idx]);

    columnTasks.forEach((t, order) => {
      const taskIdx = this.tasks.findIndex((x) => x.id === t.id);
      if (taskIdx >= 0) {
        this.tasks[taskIdx] = { ...this.tasks[taskIdx], board_order: order };
      }
    });

    if (targetStatus !== oldStatus) {
      this.addLog({
        taskId,
        userId,
        action: "status_changed",
        fromStatus: oldStatus,
        toStatus: targetStatus,
      });
    } else {
      this.addLog({ taskId, userId, action: "updated", detail: "调整看板排序" });
    }

    const updated = this.tasks.find((t) => t.id === taskId)!;
    return { ...updated };
  }

  private renumberColumn(status: TaskStatus, projectId: number, excludeId?: number) {
    const columnTasks = this.tasks
      .filter(
        (t) =>
          t.project_id === projectId &&
          t.parent_id === null &&
          t.status === status &&
          (excludeId ? t.id !== excludeId : true)
      )
      .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0));

    columnTasks.forEach((t, order) => {
      const taskIdx = this.tasks.findIndex((x) => x.id === t.id);
      if (taskIdx >= 0) {
        this.tasks[taskIdx] = { ...this.tasks[taskIdx], board_order: order };
      }
    });
  }

  private addLog(input: {
    taskId: number;
    userId: number;
    action: string;
    fromStatus?: TaskStatus | null;
    toStatus?: TaskStatus | null;
    detail?: string | null;
  }) {
    const member = this.members.find((m) => m.user_id === input.userId);
    this.logs.push({
      id: this.nextLogId++,
      task_id: input.taskId,
      user_id: input.userId,
      username: member?.username ?? "admin",
      action: input.action,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      detail: input.detail ?? null,
      created_at: new Date(),
    });
  }
}

const MOCK_STORE_VERSION = 2;

const globalForMock = globalThis as unknown as {
  __taskManagerMockStore?: MockStore;
  __taskManagerMockStoreVersion?: number;
};

export function getMockStore(): MockStore {
  if (
    !globalForMock.__taskManagerMockStore ||
    globalForMock.__taskManagerMockStoreVersion !== MOCK_STORE_VERSION
  ) {
    globalForMock.__taskManagerMockStore = new MockStore();
    globalForMock.__taskManagerMockStoreVersion = MOCK_STORE_VERSION;
  }
  return globalForMock.__taskManagerMockStore;
}
