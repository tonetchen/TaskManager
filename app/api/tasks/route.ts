import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAuth, requirePermission } from "@/lib/api-auth";
import { getProjectById } from "@/lib/db";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import {
  createTaskWithValidation,
  getTasksWithSubtasks,
  listTasks,
} from "@/lib/services/task-service";
import { assertTaskTitleAndAssignee } from "@/lib/task-form-validation";
import { CreateTaskInput, TaskPriority, TaskStatus } from "@/lib/types";

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

export async function GET(request: NextRequest) {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as TaskStatus | null;
  const priority = searchParams.get("priority") as TaskPriority | null;
  const assigneeId = searchParams.get("assigneeId");
  const view = searchParams.get("view") || "list";
  const projectIdParam = searchParams.get("projectId");
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : 1;

  const filters = {
    status: status || undefined,
    priority: priority || undefined,
    assigneeId: assigneeId ? parseInt(assigneeId, 10) : undefined,
    projectId,
  };

  try {
    if (isMockDataMode()) {
      const store = getMockStore();
      if (!store.getProjectById(projectId)) {
        return jsonError("Project not found", 404, "NOT_FOUND");
      }
      const tasks =
        view === "board"
          ? store.listTasks(ctx.workspaceId, filters)
          : store.getTasksWithSubtasks(ctx.workspaceId, filters);
      return NextResponse.json({ tasks, role: ctx.role, mock: true, projectId });
    }

    const project = await getProjectById(ctx.workspaceId, projectId);
    if (!project) {
      return jsonError("Project not found", 404, "NOT_FOUND");
    }

    if (view === "board") {
      const tasks = await listTasks(ctx.workspaceId, filters);
      return NextResponse.json({ tasks });
    }
    const tasks = await getTasksWithSubtasks(ctx.workspaceId, filters);
    return NextResponse.json({ tasks, role: ctx.role });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePermission("task:create");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as CreateTaskInput;
    try {
      assertTaskTitleAndAssignee(body.title, body.assigneeId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "VALIDATION";
      return jsonError(message.replace(/^VALIDATION:\s*/, ""), 422, "VALIDATION_ERROR");
    }

    const projectId = body.projectId ?? 1;
    if (!isMockDataMode()) {
      const project = await getProjectById(ctx.workspaceId, projectId);
      if (!project) {
        return jsonError("Project not found", 404, "NOT_FOUND");
      }
    }

    if (isMockDataMode()) {
      const store = getMockStore();
      if (!store.getProjectById(projectId)) {
        return jsonError("Project not found", 404, "NOT_FOUND");
      }
      const task = store.createTask(ctx.userId, { ...body, projectId });
      return NextResponse.json({ task }, { status: 201 });
    }

    const task = await createTaskWithValidation(
      ctx.workspaceId,
      ctx.userId,
      ctx.role,
      { ...body, projectId }
    );
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
