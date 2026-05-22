import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { isDbConfigured } from "@/lib/db-config";
import { isMockDataMode } from "@/lib/mock-mode";

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
    const seeded = await sql`
      SELECT EXISTS(SELECT 1 FROM users WHERE github_id = 900001) AS ok
    `;
    const hasSeedData = Boolean(seeded.rows[0]?.ok);
    return NextResponse.json({
      ok: true,
      db: true,
      mock: false,
      seeded: hasSeedData,
      message: hasSeedData
        ? "数据库连接正常"
        : "数据库已连接，但尚未初始化演示数据（可执行 npm run db:init 或首次登录自动创建账号）",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "数据库连接失败";
    return NextResponse.json({
      ok: false,
      db: false,
      mock: false,
      message: `数据库不可用：${message}。可设置 USE_MOCK_DATA=true 使用 Mock 数据`,
    });
  }
}
