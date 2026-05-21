import { isDbConfigured } from "./db-config";

/** 是否使用服务端内存 Mock（不依赖 Postgres） */
export function isMockDataMode(): boolean {
  if (process.env.USE_MOCK_DATA === "true") return true;
  if (process.env.USE_MOCK_DATA === "false") return false;
  return !isDbConfigured();
}

/** 登录 / JWT 是否尝试连接数据库 */
export function shouldUseDatabase(): boolean {
  return isDbConfigured() && !isMockDataMode();
}

export const MOCK_WORKSPACE_ID = 1;
