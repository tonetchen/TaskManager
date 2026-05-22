import { createPool, sql as vercelSql } from "@vercel/postgres";
import { getPostgresConnectionString } from "./db-config";

let pool: ReturnType<typeof createPool> | undefined;

function getPool() {
  const connectionString = getPostgresConnectionString();
  if (!connectionString) {
    throw new Error("Database connection string is not configured");
  }
  if (!pool) {
    pool = createPool({ connectionString });
  }
  return pool;
}

/** 优先 TASKMANAGER_POSTGRES_URL，避免 Vercel Storage 锁死的 POSTGRES_URL 与别的项目共用 */
export const sql = Object.assign(
  ((strings: TemplateStringsArray, ...values: unknown[]) =>
    getPool().sql(strings, ...(values as Parameters<typeof vercelSql>[1][]))) as typeof vercelSql,
  {
    query: (queryText: string, values?: unknown[]) =>
      getPool().query(queryText, values as never),
  }
) as typeof vercelSql;
