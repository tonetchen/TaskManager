import { MemberRole } from "./types";

/** Mock 账号，仅用于本地/演示验证，后续替换为三方登录 */
export interface MockUser {
  username: string;
  password: string;
  /** 写入 users.github_id 的合成 ID，避免与真实 OAuth 冲突 */
  externalId: number;
  email: string;
  role: MemberRole;
}

export const MOCK_USERS: MockUser[] = [
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
