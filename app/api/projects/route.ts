import { NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/api-auth";
import { listProjects } from "@/lib/db";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";

export async function GET() {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  try {
    if (isMockDataMode()) {
      const store = getMockStore();
      return NextResponse.json({
        projects: store.listProjects(ctx.workspaceId),
        mock: true,
      });
    }

    const projects = await listProjects(ctx.workspaceId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error(error);
    return jsonError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
