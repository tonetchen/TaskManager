import { NextResponse } from "next/server";
import { jsonError, requireAuth } from "@/lib/api-auth";
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

    return NextResponse.json({
      projects: [{ id: 1, workspace_id: ctx.workspaceId, name: "默认项目" }],
    });
  } catch (error) {
    console.error(error);
    return jsonError("Internal server error", 500, "INTERNAL_ERROR");
  }
}
