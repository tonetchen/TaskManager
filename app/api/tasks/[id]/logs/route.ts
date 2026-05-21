import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/api-auth";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import { listActivityLogs } from "@/lib/services/task-service";
import { getTaskById } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const taskId = parseInt(id, 10);

  if (isMockDataMode()) {
    const store = getMockStore();
    const task = store.getTaskById(taskId);
    if (!task || task.workspace_id !== ctx.workspaceId) {
      return jsonError("Task not found", 404, "NOT_FOUND");
    }
    return NextResponse.json({ logs: store.listActivityLogs(taskId), mock: true });
  }

  const task = await getTaskById(taskId);
  if (!task || task.workspace_id !== ctx.workspaceId) {
    return jsonError("Task not found", 404, "NOT_FOUND");
  }

  const logs = await listActivityLogs(taskId);
  return NextResponse.json({ logs });
}
