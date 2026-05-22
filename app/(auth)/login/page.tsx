"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin666");
  const [error, setError] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [seedWarning, setSeedWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.mock) {
          setDbWarning(null);
          setSeedWarning(null);
          return;
        }
        if (!d.ok) {
          setDbWarning(d.message);
          setSeedWarning(null);
          return;
        }
        if (d.seeded === false) {
          setSeedWarning(
            "数据库尚未导入 seed 数据，登录后将自动创建账号；完整项目/任务数据请执行 npm run db:init"
          );
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
      if (result.error === "CredentialsSignin") {
        setError("用户名或密码错误（请使用 admin / admin666）");
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
          任务管理系统 — Mock 登录
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
              可先登录进入系统；要加载任务数据请启动数据库。
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
          admin / admin666 · member / member666 · observer / observer666
          <br />
          本地 Mock 模式：.env.local 设置 USE_MOCK_DATA=true，无需 Docker / Postgres
        </p>
      </div>
    </div>
  );
}
