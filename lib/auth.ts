import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  ensureUserWorkspace,
  getDefaultWorkspaceForUser,
  getMemberRole,
  getUserByGithubId,
  getUserByUsername,
} from "./db";
import { shouldUseDatabase, isMockDataMode } from "./mock-mode";
import { getMockUserByUsername, verifyMockCredentials, MockUser } from "./mock-auth";

const MOCK_ID_BASE = 900_000;
const DB_UNAVAILABLE_ERROR = "数据库不可用，请稍后重试";

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

async function resolveDbUser(username: string) {
  const mock = getMockUserByUsername(username);
  if (!mock) return null;

  const dbUser =
    (await getUserByUsername(username)) ??
    (await getUserByGithubId(mock.externalId));
  if (!dbUser) return null;

  const workspace = await getDefaultWorkspaceForUser(dbUser.id);
  if (!workspace) return null;

  const role = await getMemberRole(workspace.id, dbUser.id);
  if (!role) return null;

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
          console.error("[auth] 数据库连接失败:", error);
          throw new Error(DB_UNAVAILABLE_ERROR);
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

          token.id = user.id;
          token.username = user.name ?? undefined;
          token.email = user.email ?? null;
          token.avatar_url = user.image ?? null;
          token.role = role;
          token.workspaceId = workspace.id;
        } catch (error) {
          console.error("[auth] JWT 回调数据库失败:", error);
          if (error instanceof Error && error.message.includes("工作区角色")) {
            throw error;
          }
          throw new Error(DB_UNAVAILABLE_ERROR);
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
          token.role = role;
          token.workspaceId = workspace.id;
        } catch (error) {
          console.error("[auth] JWT 刷新数据库失败:", error);
          if (error instanceof Error && error.message.includes("工作区角色")) {
            throw error;
          }
          throw new Error(DB_UNAVAILABLE_ERROR);
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
