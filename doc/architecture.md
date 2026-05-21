# TaskManager 架构设计说明

## 1. 总体架构

单仓库 Next.js 全栈应用，前后端通过 REST API 解耦，部署于 Vercel。

```
Browser → Next.js App Router（TaskFlow UI）
              ↓ fetch
         Route Handlers (/app/api)
              ↓
         Service Layer (lib/services)
              ↓
         Repository (lib/db.ts)
              ↓
         Vercel Postgres
```

## 2. 分层职责

| 层 | 目录 | 职责 |
|----|------|------|
| Controller | `app/api/**/route.ts` | HTTP 入参、鉴权、响应码 |
| Service | `lib/services/` | 业务规则、状态机、RBAC 校验 |
| Repository | `lib/db.ts` | SQL CRUD |
| Domain | `lib/types.ts`, `lib/task-status.ts`, `lib/permissions.ts` | 类型与领域规则 |

## 3. 数据模型

- **users** — GitHub OAuth 用户
- **workspaces** — 工作区（首登用户自动创建默认工作区）
- **workspace_members** — 成员角色（admin / member / observer）
- **tasks** — 任务，`parent_id` 支持最多 2 层（根 + 子任务）
- **task_activity_logs** — 状态变更与操作日志

ER 关系：

```
users ──< workspace_members >── workspaces
users ──< tasks (assignee / creator)
tasks ──< tasks (parent_id, 自关联)
tasks ──< task_activity_logs
```

## 4. 状态机

```
todo → in_progress → in_review → done
              ↑          │
              └──────────┘ (驳回)
```

规则实现于 `lib/task-status.ts`，Service 层在更新状态前调用 `assertTransition`。

## 5. RBAC

| 权限 | admin | member | observer |
|------|-------|--------|----------|
| task:view | ✓ | ✓ | ✓ |
| task:create | ✓ | ✗ | ✗ |
| task:update | ✓ | ✓ | ✗ |
| task:change_status | ✓ | ✓ | ✗ |
| task:delete | ✓ | ✗ | ✗ |
| member:manage | ✓ | ✗ | ✗ |

与需求文档对齐：仅**管理员**可创建任务与管理成员；**成员**可编辑、改状态（含看板拖拽），不可创建/删除；**观察者**只读。

## 6. 认证

NextAuth **Credentials Provider** + Mock 账号（`lib/mock-auth.ts`），JWT Session。

- 默认管理员：`admin` / `admin666`
- 另含 `member`、`observer` 演示账号
- 登录后自动创建/同步 DB 用户，并按 Mock 配置写入工作区角色
- 后续接入三方 OAuth：在 `lib/auth.ts` 增加 Provider，保留现有 session/jwt 回调结构即可

## 7. 扩展性

- 可增加多工作区切换（已有 workspace 表）
- 可接入 Credentials / 企业 SSO
- UI 层与 API 已解耦，OpenDesign 原型可直接替换 `app/(dashboard)/**` 与 `components/**`

## 8. 部署

Vercel 单应用 + Vercel Postgres，见 README。

## 9. 移动端适配

采用 CSS 断点 + 少量 JS（侧栏抽屉）实现全系响应式，**非整体缩放**。

| 断点 | 布局要点 |
|------|----------|
| `<=767px` | 抽屉侧栏、看板横滑、列表卡片、全屏详情 |
| `768–1023px` | 看板 2 列 |
| `>=1024px` | 桌面默认布局 |

详细说明、测试清单与文件索引见 [mobile-adaptation.md](mobile-adaptation.md)。
