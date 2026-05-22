import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  addWorkspaceMember,
  createUser,
  ensureUserWorkspace,
  getDefaultWorkspaceForUser,
  getMemberRole,
  getUserByGithubId,
  getUserByUsername,
} from "./db";
import { shouldUseDatabase, isMockDataMode } from "./mock-mode";
import { getMockUserByUsername, verifyMockCredentials, MockUser } from "./mock-auth";

const MOCK_ID_BASE = 900_000;

function isMockSessionUser(userId: string, mock: MockUser | null): boolean {
  if (!mock) return false;
  if (isMockDataMode()) return true;
  const parsed = parseInt(userId, 10);
  return !Number.isNaN(parsed) && parsed >= MOCK_ID_BASE;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string | null;
      avatar_url: string | null;
      role?: string;
      workspaceId?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    email?: string | null;
    avatar_url?: string | null;
    role?: string;
    workspaceId?: number;
  }
}

function mockAuthUser(mock: MockUser) {
  return {
    id: String(mock.externalId),
    name: mock.username,
    email: mock.email,
    image: null as string | null,
    role: mock.role,
  };
}

/** 仅在登录时同步 Mock 账号到数据库，不在 API 请求中自动写库 */
async function resolveDbUser(username: string) {
  const mock = getMockUserByUsername(username);
  if (!mock) return null;

  let dbUser =
    (await getUserByUsername(username)) ??
    (await getUserByGithubId(mock.externalId));
  if (!dbUser) {
    dbUser = await createUser({
      githubId: mock.externalId,
      username: mock.username,
      email: mock.email,
      avatarUrl: null,
    });
  }

  let workspace = await getDefaultWorkspaceForUser(dbUser.id);
  if (!workspace) {
    const ensured = await ensureUserWorkspace(dbUser.id);
    workspace = ensured.workspace;
  }

  await addWorkspaceMember(workspace.id, dbUser.id, mock.role);
  const role = (await getMemberRole(workspace.id, dbUser.id)) ?? mock.role;
  return { dbUser, workspace, role };
}

function applyMockToToken(
  token: import("next-auth/jwt").JWT,
  mock: MockUser,
  userId: string
) {
  token.id = userId;
  token.username = mock.username;
  token.email = mock.email;
  token.avatar_url = null;
  token.role = mock.role;
  token.workspaceId = 1;
  return token;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Mock Login",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? "";
        if (!username || !password) return null;

        const mock = verifyMockCredentials(username, password);
        if (!mock) return null;

        if (isMockDataMode() || !shouldUseDatabase()) {
          return mockAuthUser(mock);
        }

        try {
          const resolved = await resolveDbUser(mock.username);
          if (!resolved) return null;

          const { dbUser, role } = resolved;
          return {
            id: dbUser.id.toString(),
            name: dbUser.username,
            email: dbUser.email,
            image: dbUser.avatar_url,
            role,
          };
        } catch (error) {
          console.error("[auth] 数据库连接失败，降级为 Mock 会话:", error);
          return mockAuthUser(mock);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const mock = getMockUserByUsername(user.name ?? "");

        if (isMockDataMode() && isMockSessionUser(user.id, mock) && mock) {
          return applyMockToToken(token, mock, user.id);
        }

        if (!shouldUseDatabase() && mock) {
          return applyMockToToken(token, mock, user.id);
        }

        try {
          const userId = parseInt(user.id, 10);
          const { workspace, role } = await ensureUserWorkspace(userId);
          const effectiveRole = mock?.role ?? role;

          token.id = user.id;
          token.username = user.name ?? undefined;
          token.email = user.email ?? null;
          token.avatar_url = user.image ?? null;
          token.role = effectiveRole;
          token.workspaceId = workspace.id;
        } catch (error) {
          console.error("[auth] JWT 回调数据库失败，使用 Mock 会话:", error);
          if (mock) {
            return applyMockToToken(token, mock, user.id);
          }
        }
      } else if (token.id && token.username) {
        const mock = getMockUserByUsername(token.username as string);
        if (isMockDataMode() && isMockSessionUser(String(token.id), mock) && mock) {
          return applyMockToToken(token, mock, String(token.id));
        }
        if (!shouldUseDatabase() && mock) {
          return applyMockToToken(token, mock, String(token.id));
        }
        try {
          const userId = parseInt(String(token.id), 10);
          const { workspace, role } = await ensureUserWorkspace(userId);
          token.role = mock?.role ?? role;
          token.workspaceId = workspace.id;
        } catch {
          if (mock) applyMockToToken(token, mock, String(token.id));
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
        session.user.username = token.username as string;
        session.user.email = token.email as string | null;
        session.user.avatar_url = token.avatar_url as string | null;
        session.user.role = token.role as string;
        session.user.workspaceId = token.workspaceId as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "taskmanager-local-dev-secret"
      : undefined),
  debug: process.env.NODE_ENV === "development",
};
