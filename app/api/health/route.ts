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
    return NextResponse.json({ ok: true, db: true, mock: false, message: "数据库连接正常" });
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
