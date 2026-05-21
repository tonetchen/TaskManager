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
npm run db:init
npm run dev
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `USE_MOCK_DATA` | `true` 时使用服务端内存 Mock（prototype 数据），无需 Postgres |
| `POSTGRES_URL` | Postgres 连接串（Mock 关闭时使用） |
| `NEXTAUTH_URL` | 应用 URL |
| `NEXTAUTH_SECRET` | NextAuth 密钥 |

## Mock 登录账号（本地验证）

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin666 | 管理员 |
| member | member666 | 成员（可编辑/改状态，不可创建/删除） |
| observer | observer666 | 观察者（只读） |

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
2. 创建 Vercel Postgres，绑定 `POSTGRES_URL`
3. 配置环境变量
4. 部署后执行 `npm run db:init`（或通过 Vercel CLI / SQL 控制台运行 `lib/schema.sql`）
5. 配置 `NEXTAUTH_URL` 为线上域名

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
