# TaskManager

任务管理系统 — Next.js 全栈框架，支持 PC 与移动端响应式布局。

## 技术栈

- Next.js 15 App Router + React 19 + TypeScript
- NextAuth (Mock Credentials) + JWT Session
- Vercel Postgres（`@vercel/postgres` 原生 SQL）
- 分层：Route Handler → Service → DB

## 本地开发（Mock 模式，推荐）

无需 Docker / Postgres，直接使用 prototype 种子数据：

```bash
cp .env.example .env.local   # 已含 USE_MOCK_DATA=true
npm install
npm run dev
```

若点击登录无反应，通常是 `.next` 缓存损坏（`main-app.js` 404）。执行：

```bash
npm run dev:clean
```

打开 http://localhost:3000/login ，使用 **admin / admin666** 登录。

## 本地开发（真实数据库）

```bash
cp .env.example .env.local
# 设置 USE_MOCK_DATA=false 并取消注释 POSTGRES_URL
docker compose up -d
# 在 Postgres 中依次执行 scripts/schema.sql、scripts/seed.sql
npm run dev
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `USE_MOCK_DATA` | `true` 时使用服务端内存 Mock（prototype 数据），无需 Postgres |
| `POSTGRES_URL` | Vercel/Neon 集成自动注入的连接串 |
| `TASKMANAGER_POSTGRES_URL` | **TaskManager 专用库**（优先于 POSTGRES_URL；Storage 锁死 POSTGRES_URL 时用） |
| `NEXTAUTH_URL` | 应用 URL |
| `NEXTAUTH_SECRET` | NextAuth 密钥 |

## Mock 登录账号

密码定义在 [`lib/mock-auth.ts`](lib/mock-auth.ts)，与 `scripts/seed.sql` 中 `users.github_id` 对应。**接库时（`USE_MOCK_DATA=false`）角色仅以 `workspace_members.role` 为准**，不再使用 `mock-auth` 中的 `role` 字段。

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin666 | 管理员 |
| member | member666 | 成员 |
| observer | observer666 | 观察者 |
| 陈勋华 | cxh666 | 管理员 |
| 李明 | liming666 | 成员 |
| 王芳 | wangfang666 | 成员 |
| 赵刚 | zhaogang666 | 成员 |
| 陈静 | chenjing666 | 观察者 |

账号定义见 [`lib/mock-auth.ts`](lib/mock-auth.ts)，后续接入三方登录时可替换 `lib/auth.ts` 中的 Provider。

## API 概览

| Method | Path | 说明 |
|--------|------|------|
| GET/POST | `/api/tasks` | 列表/创建 |
| GET/PATCH/DELETE | `/api/tasks/[id]` | 详情/更新/删除 |
| PATCH | `/api/tasks/batch-status` | 批量改状态 |
| GET | `/api/tasks/[id]/logs` | 操作日志 |
| GET/POST/PATCH | `/api/members` | 成员管理 |
| GET | `/api/me` | 当前用户 |

## Vercel 部署

1. 导入 Git 仓库到 Vercel
2. 在 [Neon](https://console.neon.tech) 新建**独立项目**（勿与 git-star-hub 共用 `neon-byzantium-castle`）
3. 环境变量：`USE_MOCK_DATA=false`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`
4. 若 Vercel Storage 锁死 `POSTGRES_URL` 无法修改，**手动新增** `TASKMANAGER_POSTGRES_URL` = 新 Neon 项目的连接串（代码会优先读它）
4. **部署后初始化数据库**（只需执行一次，在 Vercel Postgres SQL 控制台或 psql 中依次执行）：

   1. [`scripts/schema.sql`](scripts/schema.sql) — 建表（可重复执行，会自动补 `projects` 表）
   2. [`scripts/seed.sql`](scripts/seed.sql) — 演示数据（用户、项目、任务）

5. 配置 `NEXTAUTH_URL` 为线上域名，使用 **admin / admin666** 登录。

本地开发保持 `USE_MOCK_DATA=true` 即可走内存 Mock，与服务器读库互不影响。

## 页面路由

- `/` — 任务管理（看板 / 列表，支持拖拽改状态）
- `/members` — 成员管理
- `/login` — Mock 账号登录

移动端适配说明见 [doc/mobile-adaptation.md](doc/mobile-adaptation.md)（抽屉导航、看板横滑、列表卡片化等）。

UI 数据层使用 [`lib/api-client.ts`](lib/api-client.ts)，与页面组件解耦。

## 测试

```bash
npm test
```

## 文档

- [需求文档](doc/reqirement.md)
- [架构说明](doc/architecture.md)
- [移动端适配](doc/mobile-adaptation.md)
- [AI Prompt 记录](doc/prompts/)
