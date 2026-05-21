import {
  createActivityLog,
  createTask,
  deleteTask,
  getTaskById,
  getTaskDepth,
  listActivityLogs,
  listTasks,
  reorderKanban,
  updateTask,
} from "@/lib/db";
import { assertPermission } from "@/lib/permissions";
import { assertTransition } from "@/lib/task-status";
import {
  CreateTaskInput,
  MemberRole,
  Task,
  TaskStatus,
  UpdateTaskInput,
} from "@/lib/types";

const MAX_DEPTH = 1; // root + one level of subtasks = 2 layers total

export async function getTasksWithSubtasks(
  workspaceId: number,
  filters: Parameters<typeof listTasks>[1] = {}
): Promise<Task[]> {
  const roots = await listTasks(workspaceId, { ...filters, parentId: null });
  const withSubs = await Promise.all(
    roots.map(async (task) => {
      const subtasks = await listTasks(workspaceId, { parentId: task.id });
      return { ...task, subtasks };
    })
  );
  return withSubs;
}

export async function createTaskWithValidation(
  workspaceId: number,
  userId: number,
  role: MemberRole,
  input: CreateTaskInput
): Promise<Task> {
  assertPermission(role, "task:create");

  if (input.parentId) {
    const parent = await getTaskById(input.parentId);
    if (!parent || parent.workspace_id !== workspaceId) {
      throw new Error("NOT_FOUND: parent task");
    }
    const parentDepth = await getTaskDepth(input.parentId);
    if (parentDepth >= MAX_DEPTH) {
      throw new Error("VALIDATION: max subtask depth exceeded");
    }
  }

  const task = await createTask(workspaceId, userId, input);
  await createActivityLog({
    taskId: task.id,
    userId,
    action: "created",
    toStatus: task.status,
    detail: `创建任务: ${task.title}`,
  });
  return task;
}

export async function updateTaskWithValidation(
  taskId: number,
  workspaceId: number,
  userId: number,
  role: MemberRole,
  input: UpdateTaskInput
): Promise<Task> {
  assertPermission(role, "task:update");

  const existing = await getTaskById(taskId);
  if (!existing || existing.workspace_id !== workspaceId) {
    throw new Error("NOT_FOUND: task");
  }

  if (input.status && input.status !== existing.status) {
    assertPermission(role, "task:change_status");
    assertTransition(existing.status, input.status);
  }

  const updated = await updateTask(taskId, input);
  if (!updated) throw new Error("NOT_FOUND: task");

  if (input.status && input.status !== existing.status) {
    await createActivityLog({
      taskId,
      userId,
      action: "status_changed",
      fromStatus: existing.status,
      toStatus: input.status,
    });
  } else {
    await createActivityLog({
      taskId,
      userId,
      action: "updated",
      detail: "更新任务信息",
    });
  }

  return updated;
}

export async function deleteTaskWithValidation(
  taskId: number,
  workspaceId: number,
  userId: number,
  role: MemberRole
): Promise<void> {
  assertPermission(role, "task:delete");

  const existing = await getTaskById(taskId);
  if (!existing || existing.workspace_id !== workspaceId) {
    throw new Error("NOT_FOUND: task");
  }

  await createActivityLog({
    taskId,
    userId,
    action: "deleted",
    fromStatus: existing.status,
    detail: `删除任务: ${existing.title}`,
  });
  await deleteTask(taskId);
}

export async function batchUpdateStatus(
  taskIds: number[],
  status: TaskStatus,
  workspaceId: number,
  userId: number,
  role: MemberRole
): Promise<Task[]> {
  assertPermission(role, "task:change_status");

  const updated: Task[] = [];
  for (const taskId of taskIds) {
    const task = await updateTaskWithValidation(taskId, workspaceId, userId, role, {
      status,
    });
    updated.push(task);
  }
  return updated;
}

export async function reorderKanbanWithValidation(
  taskId: number,
  workspaceId: number,
  userId: number,
  role: MemberRole,
  targetStatus: TaskStatus,
  targetIndex: number
): Promise<Task> {
  assertPermission(role, "task:change_status");

  const existing = await getTaskById(taskId);
  if (!existing || existing.workspace_id !== workspaceId) {
    throw new Error("NOT_FOUND: task");
  }

  if (targetStatus !== existing.status) {
    assertTransition(existing.status, targetStatus);
  }

  const updated = await reorderKanban(workspaceId, taskId, targetStatus, targetIndex);
  if (!updated) throw new Error("NOT_FOUND: task");

  if (targetStatus !== existing.status) {
    await createActivityLog({
      taskId,
      userId,
      action: "status_changed",
      fromStatus: existing.status,
      toStatus: targetStatus,
    });
  } else {
    await createActivityLog({
      taskId,
      userId,
      action: "updated",
      detail: "调整看板排序",
    });
  }

  return updated;
}

export { listActivityLogs, getTaskById, listTasks };
