import { NextResponse } from "next/server";
import { isDbConfigured, getDbConnectionSource } from "@/lib/db-config";
import { sql } from "@/lib/sql";
import { isMockDataMode } from "@/lib/mock-mode";

async function getDbDiagnostics() {
  try {
    const [dbRow, tablesRow] = await Promise.all([
      sql`SELECT current_database() AS name`,
      sql`
        SELECT COALESCE(array_agg(tablename ORDER BY tablename), ARRAY[]::name[]) AS tables
        FROM pg_tables
        WHERE schemaname = 'public'
      `,
    ]);
    const tables = (tablesRow.rows[0]?.tables as string[] | null) ?? [];
    return {
      database: (dbRow.rows[0]?.name as string | undefined) ?? "unknown",
      tables,
      hasProjects: tables.includes("projects"),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  if (isMockDataMode()) {
    return NextResponse.json({
      ok: true,
      db: false,
      mock: true,
      message: "Mock 数据模式 — 使用 prototype 种子数据，无需 Postgres",
    });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({
      ok: false,
      db: false,
      mock: false,
      message: "未配置 POSTGRES_URL。本地调试请在 .env.local 设置 USE_MOCK_DATA=true",
    });
  }

  try {
    await sql`SELECT 1`;
    const diagnostics = await getDbDiagnostics();

    if (diagnostics && !diagnostics.hasProjects) {
      return NextResponse.json({
        ok: false,
        db: true,
        mock: false,
        seeded: false,
        database: diagnostics.database,
        tables: diagnostics.tables,
        connectionSource: getDbConnectionSource(),
        message: `应用连接的数据库「${diagnostics.database}」缺少 projects 表。若与 git-star-hub 共用 Neon，请在 Vercel 新增 TASKMANAGER_POSTGRES_URL 指向独立库后 Redeploy`,
      });
    }

    const [seedRow, statsRow] = await Promise.all([
      sql`
        SELECT EXISTS(
          SELECT 1
          FROM projects p
          WHERE p.workspace_id IN (
            SELECT wm.workspace_id
            FROM workspace_members wm
            INNER JOIN users u ON u.id = wm.user_id
            WHERE u.github_id IN (900001, 901001)
          )
        ) AS ok
      `,
      sql`
        SELECT
          (SELECT COUNT(*)::int FROM projects) AS project_count,
          (SELECT COUNT(*)::int FROM users) AS user_count,
          (SELECT COUNT(*)::int FROM workspace_members) AS member_count
      `,
    ]);
    const stats = statsRow.rows[0] as {
      project_count: number;
      user_count: number;
      member_count: number;
    };
    const hasSeedData = Boolean(seedRow.rows[0]?.ok) || stats.project_count >= 1;
    return NextResponse.json({
      ok: true,
      db: true,
      mock: false,
      seeded: hasSeedData,
      database: diagnostics?.database,
      tables: diagnostics?.tables,
      connectionSource: getDbConnectionSource(),
      stats,
      message: hasSeedData
        ? "数据库连接正常"
        : "数据库已连接，但尚未初始化演示数据，请执行 scripts/schema.sql 与 scripts/seed.sql",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据库连接失败";
    const diagnostics = await getDbDiagnostics();
    return NextResponse.json({
      ok: false,
      db: false,
      mock: false,
      database: diagnostics?.database,
      tables: diagnostics?.tables,
      message: diagnostics
        ? `数据库异常：${message}。应用当前连到「${diagnostics.database}」，已有表：${diagnostics.tables.join(", ") || "无"}。请确认 Vercel POSTGRES_URL 与 Neon 控制台为同一数据库`
        : `数据库不可用：${message}。可设置 USE_MOCK_DATA=true 使用 Mock 数据`,
    });
  }
}
