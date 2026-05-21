import { NextRequest, NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/api-auth";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import { reorderKanbanWithValidation } from "@/lib/services/task-service";
import { KanbanReorderInput, TaskStatus } from "@/lib/types";

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

export async function PATCH(request: NextRequest) {
  const ctx = await requirePermission("task:change_status");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as KanbanReorderInput;
    const taskId = Number(body.taskId);
    const index = Number(body.index);
    const status = body.status as TaskStatus;

    if (!taskId || Number.isNaN(index) || !status) {
      return jsonError("Invalid reorder payload", 422, "VALIDATION_ERROR");
    }

    if (isMockDataMode()) {
      const store = getMockStore();
      const task = store.reorderKanban(taskId, ctx.userId, status, index);
      return NextResponse.json({ task, mock: true });
    }

    const task = await reorderKanbanWithValidation(
      taskId,
      ctx.workspaceId,
      ctx.userId,
      ctx.role,
      status,
      index
    );
    return NextResponse.json({ task });
  } catch (error) {
    return handleServiceError(error);
  }
}
