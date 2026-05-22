import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUserWorkspace, getUserByGithubId } from "@/lib/db";
import { isDbConfigured } from "@/lib/db-config";
import { getMockUserByUsername, resolveMockModeUserId } from "@/lib/mock-auth";
import { isMockDataMode, MOCK_WORKSPACE_ID } from "@/lib/mock-mode";
import { assertPermission, hasPermission, Permission } from "@/lib/permissions";
import { MemberRole } from "@/lib/types";

export interface AuthContext {
  userId: number;
  workspaceId: number;
  role: MemberRole;
}

const MOCK_ID_BASE = 900_000;

function mockAuthContext(session: {
  user: { id: string; username?: string; role?: string };
}): AuthContext {
  const mock = getMockUserByUsername(session.user.username ?? "");
  const userId = resolveMockModeUserId(session.user.id, mock);
  return {
    userId,
    workspaceId: MOCK_WORKSPACE_ID,
    role: (mock?.role ?? session.user.role ?? "member") as MemberRole,
  };
}

async function resolveSessionUserId(sessionUserId: string): Promise<number | null> {
  const parsed = parseInt(sessionUserId, 10);
  if (Number.isNaN(parsed)) return null;

  if (parsed >= MOCK_ID_BASE) {
    const dbUser = await getUserByGithubId(parsed);
    return dbUser?.id ?? null;
  }
  return parsed;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  if (isMockDataMode()) {
    return mockAuthContext(session);
  }

  if (!isDbConfigured()) {
    return null;
  }

  try {
    const userId = await resolveSessionUserId(session.user.id);
    if (!userId) {
      const mock = getMockUserByUsername(session.user.username ?? "");
      if (mock) {
        const dbUser = await getUserByGithubId(mock.externalId);
        if (!dbUser) return null;
        const { workspace, role } = await ensureUserWorkspace(dbUser.id);
        return {
          userId: dbUser.id,
          workspaceId: workspace.id,
          role: (role ?? mock.role) as MemberRole,
        };
      }
      return null;
    }

    const mock = getMockUserByUsername(session.user.username ?? "");
    const { workspace, role } = await ensureUserWorkspace(userId);
    return {
      userId,
      workspaceId: workspace.id,
      role: (role ?? mock?.role ?? session.user.role ?? "observer") as MemberRole,
    };
  } catch {
    return null;
  }
}

export function jsonError(error: string, status: number, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return jsonError("未登录", 401, "UNAUTHORIZED");
  }

  if (isMockDataMode()) {
    return mockAuthContext(session);
  }

  if (!isDbConfigured()) {
    return jsonError(
      "数据库未配置。本地调试请设置 USE_MOCK_DATA=true",
      503,
      "DB_NOT_CONFIGURED"
    );
  }

  const ctx = await getAuthContext();
  if (!ctx) {
    return jsonError(
      "未授权或数据库未就绪，请重新登录并执行 lib/schema.sql 与 scripts/seed.sql",
      401,
      "UNAUTHORIZED"
    );
  }
  return ctx;
}

export async function requirePermission(
  permission: Permission
): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth();
  if (ctx instanceof NextResponse) return ctx;

  try {
    assertPermission(ctx.role, permission);
  } catch {
    return jsonError("Forbidden", 403, "FORBIDDEN");
  }
  return ctx;
}

export { hasPermission };
