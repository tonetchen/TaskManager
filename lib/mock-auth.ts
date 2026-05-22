import { MemberRole } from "./types";

/** 演示登录账号：密码在此校验，users 表只存身份（github_id 与 seed.sql 一致） */
export interface MockUser {
  username: string;
  password: string;
  /** 写入 users.github_id 的合成 ID，避免与真实 OAuth 冲突 */
  externalId: number;
  email: string;
  role: MemberRole;
}

export const MOCK_USERS: MockUser[] = [
  // 角色演示账号
  {
    username: "admin",
    password: "admin666",
    externalId: 900_001,
    email: "admin@mock.local",
    role: "admin",
  },
  {
    username: "member",
    password: "member666",
    externalId: 900_002,
    email: "member@mock.local",
    role: "member",
  },
  {
    username: "observer",
    password: "observer666",
    externalId: 900_003,
    email: "observer@mock.local",
    role: "observer",
  },
  // 团队成员（与 scripts/seed.sql、lib/mock-data.ts 一致，生产环境可登录演示）
  {
    username: "陈勋华",
    password: "cxh666",
    externalId: 901_001,
    email: "chenxunhua1@jd.com",
    role: "admin",
  },
  {
    username: "李明",
    password: "liming666",
    externalId: 901_002,
    email: "liming@jd.com",
    role: "member",
  },
  {
    username: "王芳",
    password: "wangfang666",
    externalId: 901_003,
    email: "wangfang@jd.com",
    role: "member",
  },
  {
    username: "赵刚",
    password: "zhaogang666",
    externalId: 901_004,
    email: "zhaogang@jd.com",
    role: "member",
  },
  {
    username: "陈静",
    password: "chenjing666",
    externalId: 901_005,
    email: "chenjing@jd.com",
    role: "observer",
  },
];

export function verifyMockCredentials(
  username: string,
  password: string
): MockUser | null {
  const user = MOCK_USERS.find(
    (u) => u.username === username && u.password === password
  );
  return user ?? null;
}

export function getMockUserByUsername(username: string): MockUser | null {
  return MOCK_USERS.find((u) => u.username === username) ?? null;
}

/** Mock 模式下将 90100x 映射为 mock-data 中的 user_id 1–5 */
export function resolveMockModeUserId(sessionUserId: string, mock: MockUser | null): number {
  if (mock && mock.externalId >= 901_001 && mock.externalId <= 901_005) {
    return mock.externalId - 901_000;
  }
  const parsed = parseInt(sessionUserId, 10);
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  return mock?.externalId ?? 1;
}
