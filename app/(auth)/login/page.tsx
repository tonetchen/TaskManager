"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MOCK_USERS } from "@/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin666");
  const [error, setError] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [seedWarning, setSeedWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataMode, setDataMode] = useState<"mock" | "db" | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setDataMode(d.mock ? "mock" : "db");
        if (d.mock) {
          setDbWarning(null);
          setSeedWarning(null);
          return;
        }
        if (!d.ok) {
          const detail =
            d.database && d.tables
              ? `（应用连到库「${d.database}」，表：${d.tables.join(", ") || "无"}）`
              : "";
          setDbWarning(`${d.message}${detail}`);
          setSeedWarning(null);
          return;
        }
        if (d.seeded === false) {
          setSeedWarning("数据库尚未初始化，请在 Postgres 中执行 scripts/schema.sql 与 scripts/seed.sql");
        } else {
          setSeedWarning(null);
        }
      })
      .catch(() => setDbWarning("无法检测服务状态"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("数据库不可用")) {
        setError(result.error);
      } else if (result.error.includes("工作区角色")) {
        setError(result.error);
      } else if (result.error === "CredentialsSignin") {
        setError(
          "登录失败：请确认账号密码正确，且已在数据库执行 scripts/schema.sql 与 scripts/seed.sql（角色以 workspace_members 为准）"
        );
      } else {
        setError(`登录失败：${result.error}`);
      }
      return;
    }

    if (!result?.ok) {
      setError("登录失败，请检查 NEXTAUTH_SECRET 是否已配置");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="sidebar-logo" style={{ marginBottom: 8 }}>
          <span className="logo-mark">T</span>
          TaskFlow
        </div>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
          任务管理系统
          {dataMode === "mock"
            ? " — Mock 演示模式"
            : dataMode === "db"
              ? " — 数据库模式"
              : ""}
        </p>

        {seedWarning && !dbWarning && (
          <div
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning)",
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {seedWarning}
          </div>
        )}

        {dbWarning && (
          <div
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning)",
              fontSize: 12,
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {dbWarning}
            <br />
            <span style={{ color: "var(--muted)" }}>
              若与 git-star-hub 共用 Neon 且无法改 POSTGRES_URL，请在 Vercel 新增可编辑的 TASKMANAGER_POSTGRES_URL 指向独立库后 Redeploy。
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">用户名</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">密码</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p style={{ color: "var(--error)", margin: 0, fontSize: 13 }}>{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--muted-light)", lineHeight: 1.6 }}>
          演示账号：
          <br />
          {MOCK_USERS.map((u) => `${u.username} / ${u.password}`).join(" · ")}
        </p>
      </div>
    </div>
  );
}
