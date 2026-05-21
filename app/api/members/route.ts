import { NextRequest, NextResponse } from "next/server";
import { jsonError, requireAuth, requirePermission } from "@/lib/api-auth";
import { isMockDataMode } from "@/lib/mock-mode";
import { getMockStore } from "@/lib/mock-store";
import {
  changeMemberRole,
  inviteMember,
  listMembers,
} from "@/lib/services/member-service";
import { MemberRole } from "@/lib/types";

function handleServiceError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.startsWith("NOT_FOUND")) {
    return jsonError(message, 404, "NOT_FOUND");
  }
  if (message.startsWith("FORBIDDEN")) {
    return jsonError(message, 403, "FORBIDDEN");
  }
  console.error(error);
  return jsonError("Internal server error", 500, "INTERNAL_ERROR");
}

export async function GET() {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  try {
    if (isMockDataMode()) {
      const store = getMockStore();
      const members = store.listMembers(ctx.workspaceId);
      return NextResponse.json({ members, role: ctx.role, mock: true });
    }

    const members = await listMembers(ctx.workspaceId, ctx.role);
    return NextResponse.json({ members, role: ctx.role });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePermission("member:manage");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { username: string; role: MemberRole };
    if (!body.username?.trim()) {
      return jsonError("username required", 422, "VALIDATION_ERROR");
    }

    if (isMockDataMode()) {
      const store = getMockStore();
      const member = store.inviteMember(body.username.trim(), body.role || "member");
      return NextResponse.json({ member }, { status: 201 });
    }

    const member = await inviteMember(
      ctx.workspaceId,
      ctx.role,
      body.username.trim(),
      body.role || "member"
    );
    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePermission("member:manage");
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { userId: number; role: MemberRole };
    if (!body.userId || !body.role) {
      return jsonError("userId and role required", 422, "VALIDATION_ERROR");
    }

    if (isMockDataMode()) {
      const store = getMockStore();
      const member = store.changeMemberRole(body.userId, body.role);
      return NextResponse.json({ member, mock: true });
    }

    const member = await changeMemberRole(
      ctx.workspaceId,
      ctx.role,
      body.userId,
      body.role
    );
    return NextResponse.json({ member });
  } catch (error) {
    return handleServiceError(error);
  }
}
