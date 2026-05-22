/**
 * 数据库连接串。
 * TASKMANAGER_POSTGRES_URL：TaskManager 专用库（Vercel Storage 锁 POSTGRES_URL 时用这个）
 * POSTGRES_URL：Vercel/Neon 集成默认注入
 */
export function getPostgresConnectionString(): string | undefined {
  const dedicated = process.env.TASKMANAGER_POSTGRES_URL?.trim();
  if (dedicated) return dedicated;
  return process.env.POSTGRES_URL?.trim() || undefined;
}

export function isDbConfigured(): boolean {
  return Boolean(getPostgresConnectionString());
}

export function getDbConnectionSource(): "taskmanager" | "postgres" | "none" {
  if (process.env.TASKMANAGER_POSTGRES_URL?.trim()) return "taskmanager";
  if (process.env.POSTGRES_URL?.trim()) return "postgres";
  return "none";
}
