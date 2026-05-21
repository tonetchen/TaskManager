import { NextRequest, NextResponse } from "next/server";
import { jsonError, requirePermission } from "@/lib/api-auth";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import { batchUpdateStatus } from "@/lib/services/task-service";
import { TaskStatus } from "@/lib/types";

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
    const body = (await request.json()) as { taskIds: number[]; status: TaskStatus };
    if (!Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      return jsonError("taskIds required", 422, "VALIDATION_ERROR");
    }
    if (!body.status) {
      return jsonError("status required", 422, "VALIDATION_ERROR");
    }

    if (isMockDataMode()) {
      const store = getMockStore();
      const tasks = store.batchUpdateStatus(body.taskIds, body.status, ctx.userId);
      return NextResponse.json({ tasks, mock: true });
    }

    const tasks = await batchUpdateStatus(
      body.taskIds,
      body.status,
      ctx.workspaceId,
      ctx.userId,
      ctx.role
    );
    return NextResponse.json({ tasks });
  } catch (error) {
    return handleServiceError(error);
  }
}
