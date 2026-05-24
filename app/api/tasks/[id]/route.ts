import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAuth, requirePermission } from "@/lib/api-auth";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import {
  deleteTaskWithValidation,
  getTaskDetail,
  listActivityLogs,
  updateTaskWithValidation,
} from "@/lib/services/task-service";
import { getTaskById } from "@/lib/db";
import { assertTaskTitleAndAssignee } from "@/lib/task-form-validation";
import { UpdateTaskInput } from "@/lib/types";

function handleServiceError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.startsWith("NOT_FOUND")) {
    return jsonError(message, 404, "NOT_FOUND");
  }
  if (message.startsWith("VALIDATION") || message.startsWith("INVALID")) {
    return jsonError(message, 422, "VALIDATION_ERROR");
  }
  if (message.startsWith("FORBIDDEN")) {
    return jsonError(message, 403, "FORBIDDEN");
  }
  console.error(error);
  return jsonError("Internal server error", 500, "INTERNAL_ERROR");
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const taskId = parseInt(id, 10);

  try {
    if (isMockDataMode()) {
      const store = getMockStore();
      const task = store.getTaskById(taskId);
      if (!task || task.workspace_id !== ctx.workspaceId) {
        return jsonError("Task not found", 404, "NOT_FOUND");
      }
      const logs = store.listActivityLogs(taskId);
      return NextResponse.json({ task, logs, mock: true });
    }

    const task = await getTaskDetail(taskId, ctx.workspaceId);
    if (!task) {
      return jsonError("Task not found", 404, "NOT_FOUND");
    }
    const logs = await listActivityLogs(taskId);
    return NextResponse.json({ task, logs });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await requirePermission("task:update");
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const taskId = parseInt(id, 10);

  try {
    const body = (await request.json()) as UpdateTaskInput;

    if (isMockDataMode()) {
      const store = getMockStore();
      const task = store.updateTask(taskId, ctx.userId, body);
      return NextResponse.json({ task, mock: true });
    }

    const existing = await getTaskById(taskId);
    if (!existing || existing.workspace_id !== ctx.workspaceId) {
      return jsonError("Task not found", 404, "NOT_FOUND");
    }
    const nextTitle = body.title !== undefined ? body.title : existing.title;
    const nextAssigneeId =
      body.assigneeId !== undefined ? body.assigneeId : existing.assignee_id;
    try {
      assertTaskTitleAndAssignee(nextTitle, nextAssigneeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "VALIDATION";
      return jsonError(message.replace(/^VALIDATION:\s*/, ""), 422, "VALIDATION_ERROR");
    }

    const task = await updateTaskWithValidation(
      taskId,
      ctx.workspaceId,
      ctx.userId,
      ctx.role,
      body
    );
    return NextResponse.json({ task });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requirePermission("task:delete");
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const taskId = parseInt(id, 10);

  try {
    if (isMockDataMode()) {
      const store = getMockStore();
      store.deleteTask(taskId, ctx.userId);
      return NextResponse.json({ success: true, mock: true });
    }

    await deleteTaskWithValidation(taskId, ctx.workspaceId, ctx.userId, ctx.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleServiceError(error);
  }
}
