# TaskManager 架构设计说明

> 本文档描述 TaskFlow 任务管理系统的全栈架构，与 [`reqirement.md`](reqirement.md) 需求对齐，并与当前代码仓库实现一致。  
> 相关文档：[README](../README.md) · [移动端适配](mobile-adaptation.md) · [AI Prompt 记录](prompts/initial-implementation.md)

---

## 1. 设计目标与需求映射

| 需求能力 | 架构落点 |
|----------|----------|
| 任务 CRUD、子任务（最多 2 层） | `tasks.parent_id` + Service 层深度校验 |
| 列表 / 看板、筛选、拖拽改状态 | `TasksApp` + `KanbanView` + `/api/tasks/kanban-reorder` |
| 四状态流转 + 批量改状态 | `lib/task-status.ts` + `/api/tasks/batch-status` |
| 操作日志 | `task_activity_logs` + 详情面板 |
| 三角色 RBAC | `lib/permissions.ts` + `lib/api-auth.ts` |
| 前后端解耦 | REST API + `lib/api-client.ts` |
| Mock 可本地跑 / 线上接库 | `USE_MOCK_DATA` 双模式 |
| 移动端真实适配 | CSS 断点 + 抽屉/卡片/纵向看板（见 §16） |

---

## 2. 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Next.js 15 App Router、React 19、TypeScript |
| 认证 | NextAuth Credentials Provider + JWT Session |
| 数据库 | Vercel Postgres / Neon（`@vercel/postgres` 原生 SQL） |
| 拖拽 | `@dnd-kit`（看板列内排序） |
| 测试 | Vitest（领域逻辑单元测试） |
| 部署 | Vercel 单应用 |

---

## 3. 工程目录结构

```
TaskManager/
├── app/
│   ├── (auth)/login/          # 登录页（health 检测 Mock/DB 模式）
│   ├── (dashboard)/           # 主应用壳：侧栏 + 内容区
│   │   ├── page.tsx           # 任务管理（列表/看板）
│   │   ├── members/           # 成员管理
│   │   └── tasks/[id]/        # 任务详情深链（重定向/面板）
│   ├── api/                   # Route Handlers（Controller 层）
│   │   ├── auth/[...nextauth]/
│   │   ├── health/            # 运行模式与数据库诊断
│   │   ├── tasks/             # 任务 CRUD、批量、看板排序、日志
│   │   ├── members/
│   │   └── projects/
│   ├── layout.tsx             # 根布局 + SessionProvider
│   └── taskflow.css           # TaskFlow UI 样式（含响应式断点）
├── components/
│   ├── auth/                  # SessionProvider 封装
│   └── taskflow/              # 业务 UI 组件（与 API 解耦）
├── lib/
│   ├── services/              # Service 层（DB 模式业务规则）
│   ├── db.ts                  # Repository（SQL CRUD）
│   ├── db-config.ts           # 连接串优先级
│   ├── sql.ts                 # Postgres 客户端封装
│   ├── api-auth.ts            # API 鉴权上下文
│   ├── api-client.ts          # 前端 HTTP 客户端
│   ├── auth.ts                # NextAuth 配置
│   ├── mock-mode.ts           # Mock/DB 模式判定
│   ├── mock-auth.ts           # 演示账号密码
│   ├── mock-data.ts           # 种子数据定义
│   ├── mock-store.ts          # 内存 Mock 仓储
│   ├── permissions.ts         # RBAC 权限矩阵
│   ├── task-status.ts         # 状态机
│   ├── task-form-validation.ts# 表单校验（标题+负责人）
│   ├── taskflow-utils.ts      # UI 工具函数
│   └── types.ts               # 共享类型
├── scripts/
│   ├── schema.sql             # 建表 + 索引 + 触发器
│   └── seed.sql               # 演示数据
├── doc/                       # 需求、架构、移动端、Prompt
└── prototype/                 # OpenDesign HTML 原型（参考）
```

---

## 4. 总体架构

单仓库 Next.js 全栈应用：**浏览器只访问 REST API**，不直连数据库；UI 与数据通过 `lib/api-client.ts` 解耦，便于替换 OpenDesign 原型或接入其他前端。

### 4.1 请求链路（数据库模式）

```
Browser（React Client Components）
    │  fetch /api/*
    ▼
Route Handler（app/api/**/route.ts）
    │  requireAuth / requirePermission（lib/api-auth.ts）
    ▼
Service Layer（lib/services/*.ts）
    │  RBAC · 状态机 · 校验 · 子任务深度 · 写操作日志
    ▼
Repository（lib/db.ts）
    │  参数化 SQL
    ▼
Postgres（Vercel / Neon）
```

### 4.2 双模式运行时（Mock / DB）

由环境变量 `USE_MOCK_DATA` 与是否配置连接串共同决定（`lib/mock-mode.ts`）：

| 条件 | 行为 |
|------|------|
| `USE_MOCK_DATA=true` | 强制 Mock：业务数据走 `mock-store`，角色来自 `mock-auth` |
| `USE_MOCK_DATA=false` 且已配置连接串 | 强制 DB：业务走 Service + `db.ts`，角色来自 `workspace_members` |
| 未显式设置且未配置连接串 | 自动 Mock（本地零配置开发） |

```
Route Handler
    │
    ├─ isMockDataMode() === true
    │       └─► getMockStore()（lib/mock-store.ts，内存单例）
    │
    └─ isMockDataMode() === false
            └─► lib/services → lib/db.ts → Postgres
```

**设计意图**：本地开发无需 Docker；线上 Vercel 接独立 Postgres；同一套 Route 与 UI 代码两种环境均可运行。

Mock 相关文件职责：

| 文件 | 职责 |
|------|------|
| `mock-mode.ts` | `isMockDataMode()`、`shouldUseDatabase()`、`MOCK_WORKSPACE_ID` |
| `mock-auth.ts` | 演示账号用户名/密码；`role` **仅 Mock 模式**写入 JWT |
| `mock-data.ts` | 与 prototype 对齐的初始任务/成员/项目数据 |
| `mock-store.ts` | 内存 CRUD，复刻 Service 层校验（状态机、RBAC、必填项） |

---

## 5. 分层职责

| 层 | 位置 | 职责 | 不应做 |
|----|------|------|--------|
| **Controller** | `app/api/**/route.ts` | 解析 HTTP、调用鉴权、选 Mock/DB 分支、映射 HTTP 状态码 | 复杂业务规则、裸 SQL |
| **Service** | `lib/services/` | 业务编排：权限、状态机、子任务层级、活动日志 | 直接读写 Request/Response |
| **Repository** | `lib/db.ts` | SQL CRUD、事务性数据访问 | RBAC 决策 |
| **Domain** | `types.ts`、`permissions.ts`、`task-status.ts`、`task-form-validation.ts` | 纯函数领域规则 | I/O |
| **API Client** | `lib/api-client.ts` | 浏览器侧 typed fetch 封装 | 业务逻辑 |
| **UI** | `components/taskflow/` | 展示与交互；通过 `api` + `useSession` 获取数据与权限 | 直连数据库 |

Service 层现有模块：

- `task-service.ts` — 任务列表（含子任务树）、创建/更新/删除、看板排序、批量改状态
- `member-service.ts` — 成员列表、改角色

---

## 6. 认证与鉴权

### 6.1 登录（NextAuth）

- Provider：`CredentialsProvider`（`lib/auth.ts`）
- 密码校验：**始终**走 `lib/mock-auth.ts` 中的演示账号表（与 `seed.sql` 中 `users.github_id` 对齐）
- Session：JWT，字段含 `id`、`username`、`role`（Mock 模式）、`workspaceId`

**数据库模式**（`USE_MOCK_DATA=false`）：

1. `authorize`：校验密码 → 查 `users` → 查 `workspace_members.role`
2. **角色仅以 `workspace_members.role` 为准**，不使用 `mock-auth.role`
3. 无成员记录或 DB 不可用：**拒绝登录**，不降级 Mock 会话

**Mock 模式**：JWT 中 `role` 来自 `mock-auth`；`userId` 使用 mock 内存 ID。

### 6.2 API 鉴权（`lib/api-auth.ts`）

每个受保护 Route 入口调用：

```ts
const ctx = await requireAuth();           // 401 未登录
const ctx = await requirePermission("task:create"); // 403 无权限
```

`AuthContext` 结构：

| 字段 | 说明 |
|------|------|
| `userId` | 当前用户 DB id（Mock 模式为 mock id） |
| `workspaceId` | 工作区 id |
| `role` | `admin` / `member` / `observer` |

DB 模式下通过 `ensureUserWorkspace(userId)` 解析工作区与角色；缺失角色记录时返回 503 并提示执行 seed。

### 6.3 前端权限

- `useSession()` 读取 JWT 中的 `role`
- `hasPermission(role, perm)` 控制按钮、批量栏、勾选框、看板拖拽等
- **观察者**：只读；列表不显示批量勾选框（`canBatchSelect={canChangeStatus}`）

---

## 7. 数据模型与表设计

> DDL 源码：[`scripts/schema.sql`](../scripts/schema.sql) · 演示数据：[`scripts/seed.sql`](../scripts/seed.sql)

### 7.1 设计原则

| 原则 | 说明 |
|------|------|
| **工作区隔离** | 业务数据均带 `workspace_id`，为多租户/多工作区预留边界 |
| **角色与账号分离** | `users` 存身份；`workspace_members.role` 存权限（可同人跨区不同角色） |
| **项目维度** | `projects` 将任务按产品/迭代分组，侧栏切换不影响工作区 |
| **树形任务有限深度** | `tasks.parent_id` 自关联；应用层限制 2 层，DB 不递归约束（扩展见 §17.2） |
| **枚举用 CHECK** | `status` / `priority` / `role` 用 `VARCHAR + CHECK`，便于后续加值而不改类型 |
| **可重复迁移** | `IF NOT EXISTS` + `ALTER ADD COLUMN IF NOT EXISTS`，支持旧库升级 |
| **审计留痕** | `task_activity_logs`  append-only；`created_at` / `updated_at` 分表维护 |

### 7.2 ER 关系

```
users ──< workspace_members >── workspaces
workspaces ──< projects
workspaces ──< tasks >── projects (FK, ON DELETE CASCADE)
users ──< tasks (assignee_id SET NULL, created_by CASCADE)
tasks ──< tasks (parent_id CASCADE, 自关联子任务)
tasks ──< task_activity_logs
users ──< task_activity_logs
```

### 7.3 表结构明细

#### users — 用户身份

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | 内部主键 |
| `github_id` | BIGINT | NOT NULL, UNIQUE | 外部身份键；演示账号与 `mock-auth.externalId` 对齐，OAuth 接入时可存 provider 侧 id |
| `username` | VARCHAR(255) | NOT NULL | 登录名 / 展示名 |
| `email` | VARCHAR(255) | 可空 | 联系邮箱 |
| `avatar_url` | TEXT | 可空 | 头像 URL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 触发器维护 | 最后更新时间 |

**索引**：`idx_users_github_id (github_id)` — 登录时按外部 id 查用户。

---

#### workspaces — 工作区

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | 工作区 id |
| `name` | VARCHAR(255) | NOT NULL, DEFAULT '默认工作区' | 工作区名称 |
| `created_by` | INTEGER | FK → users(id) CASCADE | 创建者 |
| `created_at` / `updated_at` | TIMESTAMPTZ | | 时间戳 |

**扩展**：一人可创建多个 workspace；当前 UI 默认使用用户首个工作区（`ensureUserWorkspace`）。

---

#### workspace_members — 成员与 RBAC

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | |
| `workspace_id` | INTEGER | FK → workspaces CASCADE | 所属工作区 |
| `user_id` | INTEGER | FK → users CASCADE | 成员用户 |
| `role` | VARCHAR(20) | CHECK IN (`admin`,`member`,`observer`) | **DB 模式下 RBAC 唯一权威来源** |
| `created_at` / `updated_at` | TIMESTAMPTZ | | 加入时间等 |
| — | UNIQUE | `(workspace_id, user_id)` | 同一工作区内用户唯一 |

**索引**：
- `idx_workspace_members_workspace (workspace_id)` — 列成员列表
- `idx_workspace_members_user (user_id)` — 查用户所属工作区

---

#### projects — 项目

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | |
| `workspace_id` | INTEGER | FK → workspaces CASCADE | 项目归属工作区 |
| `name` | VARCHAR(255) | NOT NULL | 项目名称（如「电商平台重构」） |
| `created_at` / `updated_at` | TIMESTAMPTZ | | |

**索引**：`idx_projects_workspace (workspace_id)` — 侧栏按工作区拉项目列表。

**与任务关系**：`tasks.project_id` 可空 FK；删除项目时级联删除其下任务（`ON DELETE CASCADE`）。

---

#### tasks — 任务（核心表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | |
| `workspace_id` | INTEGER | FK → workspaces CASCADE | 数据隔离边界 |
| `project_id` | INTEGER | FK → projects CASCADE, 可空 | 所属项目；筛选与侧栏切换 |
| `parent_id` | INTEGER | FK → tasks CASCADE, 可空 | `NULL`=根任务；非空=子任务 |
| `title` | VARCHAR(500) | NOT NULL | 标题（应用层必填） |
| `description` | TEXT | 可空 | 描述 |
| `priority` | VARCHAR(20) | DEFAULT `medium`, CHECK | `high` / `medium` / `low` |
| `status` | VARCHAR(20) | DEFAULT `todo`, CHECK | 四态状态机枚举 |
| `board_order` | INTEGER | NOT NULL DEFAULT 0 | 看板列内排序（越小越靠前） |
| `due_date` | DATE | 可空 | 截止日期 |
| `assignee_id` | INTEGER | FK → users SET NULL | 负责人（应用层创建/编辑必填） |
| `created_by` | INTEGER | FK → users CASCADE | 创建人 |
| `created_at` / `updated_at` | TIMESTAMPTZ | | |

**索引与查询场景**：

| 索引 | 服务场景 |
|------|----------|
| `idx_tasks_workspace_status (workspace_id, status)` | 看板按列拉任务、按状态筛选 |
| `idx_tasks_project (project_id)` | 当前项目任务列表 |
| `idx_tasks_assignee (assignee_id)` | 按负责人筛选 |
| `idx_tasks_parent (parent_id)` | 加载子任务树 |

**子任务策略**：DB 允许任意深度自关联；Service 层 `MAX_DEPTH = 1`（根 + 一层子任务），与需求「最多 2 层」一致。

---

#### task_activity_logs — 操作日志

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | SERIAL | PK | |
| `task_id` | INTEGER | FK → tasks CASCADE | 关联任务 |
| `user_id` | INTEGER | FK → users CASCADE | 操作人 |
| `action` | VARCHAR(50) | NOT NULL | 如 `status_change`、`create`、`delete` |
| `from_status` | VARCHAR(20) | 可空 | 变更前状态 |
| `to_status` | VARCHAR(20) | 可空 | 变更后状态 |
| `detail` | TEXT | 可空 | 补充说明 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | 仅创建时间（日志不更新） |

**索引**：`idx_logs_task_id (task_id)` — 详情页按任务拉时间线。

**设计说明**：日志表无 `updated_at`，符合 append-only 审计语义；未来可扩展 `action` 枚举或独立 `audit_logs` 全站表。

---

### 7.4 索引总览

| 索引名 | 表 | 列 | 目的 |
|--------|-----|-----|------|
| `idx_users_github_id` | users | github_id | OAuth / 演示账号映射登录 |
| `idx_workspace_members_workspace` | workspace_members | workspace_id | 成员管理页 |
| `idx_workspace_members_user` | workspace_members | user_id | 解析用户工作区 |
| `idx_projects_workspace` | projects | workspace_id | 项目列表 |
| `idx_tasks_workspace_status` | tasks | workspace_id, status | 看板 + 状态筛选 |
| `idx_tasks_project` | tasks | project_id | 项目维度任务 |
| `idx_tasks_assignee` | tasks | assignee_id | 负责人筛选 |
| `idx_tasks_parent` | tasks | parent_id | 子任务展开 |
| `idx_logs_task_id` | task_activity_logs | task_id | 任务详情日志 |

**未建但可扩展的索引**（数据量增大时）：`(workspace_id, project_id, status)` 复合索引；`tasks(due_date)` 逾期提醒。

---

### 7.5 约束与级联策略

| 关系 | ON DELETE | 理由 |
|------|-----------|------|
| workspace → tasks / projects / members | CASCADE | 删工作区清理全部从属数据 |
| user → tasks.created_by | CASCADE | 创建人账号删除时任务一并清理（演示环境） |
| user → tasks.assignee_id | SET NULL | 负责人离职任务保留、负责人置空 |
| project → tasks | CASCADE | 删项目删其任务 |
| task → subtasks (parent_id) | CASCADE | 删父任务删子任务 |
| task → logs | CASCADE | 删任务删日志 |

生产环境若需软删除，可增 `deleted_at` 列并改 Service 层过滤，FK 策略可保持不变。

---

### 7.6 维护与初始化

- **触发器**：各业务表 `updated_at` 由 `update_updated_at_column()` 统一维护
- **执行顺序**：`schema.sql` → `seed.sql`（seed 使用 `ON CONFLICT` 可重复执行）
- **旧库升级**：缺 `projects` 表或 `tasks.project_id` 列时，schema 自动补建；`/api/health` 检测 `hasProjects`

---

## 8. 状态机

四个默认状态及合法流转（`lib/task-status.ts`）：

```
todo → in_progress → in_review → done
              ↑          │
              └──────────┘   （审核驳回）
```

| 规则 | 实现 |
|------|------|
| 禁止跨级跳转（如 todo → done） | `canTransition()` / `assertTransition()` |
| 同状态 noop 允许 | 批量/重复提交不报错 |
| 看板拖拽改列 | 先校验目标状态合法，再更新 `board_order` |
| 单元测试 | `lib/task-status.test.ts`（5 用例） |

Service 层在 `updateTask`、批量改状态、看板 reorder 前均调用状态机。

---

## 9. RBAC 权限矩阵

定义于 `lib/permissions.ts`：

| 权限 | admin | member | observer | 典型 UI/API |
|------|:-----:|:------:|:--------:|-------------|
| `task:view` | ✓ | ✓ | ✓ | 列表、看板、详情 |
| `task:create` | ✓ | ✗ | ✗ | 「新建任务」、POST `/api/tasks` |
| `task:update` | ✓ | ✓ | ✗ | 编辑标题/描述/负责人等 |
| `task:change_status` | ✓ | ✓ | ✗ | 看板拖拽、批量栏、子任务勾选完成 |
| `task:delete` | ✓ | ✗ | ✗ | 删除任务 |
| `member:manage` | ✓ | ✗ | ✗ | 成员页改角色 |

与需求文档对齐：

- **管理员**：创建任务、删除任务、管理成员角色
- **成员**：编辑任务、改状态（含审批流中的状态变更），不可创建/删除
- **观察者**：只读，无勾选、无批量、无拖拽

单元测试：`lib/permissions.test.ts`（12 用例）。

---

## 10. 输入校验与错误处理

### 10.1 任务表单

`lib/task-form-validation.ts`（前后端一致）：

- **标题**：非空（trim 后）
- **负责人**：必选（`assigneeId` 非 null）

前端：`TaskModal` 提交前 `window.alert`；后端：Service / MockStore 抛 `VALIDATION:` 前缀，Route 映射 **422**。

单元测试：`lib/task-form-validation.test.ts`（4 用例）。

### 10.2 API 错误码约定

Route 层 `handleServiceError` 统一映射：

| 前缀 / 场景 | HTTP | code |
|-------------|------|------|
| 未登录 | 401 | — |
| `FORBIDDEN` | 403 | FORBIDDEN |
| `NOT_FOUND` | 404 | NOT_FOUND |
| `VALIDATION` / `INVALID_TRANSITION` | 422 | VALIDATION_ERROR |
| 其它 | 500 | INTERNAL_ERROR |

---

## 11. 操作日志

- 表：`task_activity_logs`（`action`、`from_status`、`to_status`、`detail`、`user_id`、`created_at`）
- 写入时机：Service 层任务创建、状态变更、删除等（DB 模式）；MockStore 同步写入内存日志
- 读取：`GET /api/tasks/[id]` 返回 `{ task, logs }`；详情面板展示时间线

当前**无独立全站日志页**（需求未要求）；日志随任务详情展示。

---

## 12. REST API 一览

| Method | Path | 权限 | 说明 |
|--------|------|------|------|
| GET | `/api/health` | 公开 | Mock/DB 模式、连接诊断、是否已 seed |
| GET/POST | `/api/auth/*` | — | NextAuth 登录/session |
| GET | `/api/me` | 已登录 | 当前用户与工作区信息 |
| GET | `/api/projects` | 已登录 | 项目列表 |
| GET | `/api/tasks` | `task:view` | 列表；query: `status`,`priority`,`assigneeId`,`projectId`,`view` |
| POST | `/api/tasks` | `task:create` | 创建任务（含子任务） |
| GET | `/api/tasks/[id]` | `task:view` | 任务详情 + 操作日志 |
| PATCH | `/api/tasks/[id]` | `task:update` / 改状态 | 更新字段或状态 |
| DELETE | `/api/tasks/[id]` | `task:delete` | 删除任务 |
| PATCH | `/api/tasks/batch-status` | `task:change_status` | 批量改状态 `{ taskIds, status }` |
| PATCH | `/api/tasks/kanban-reorder` | `task:change_status` | 看板拖拽 `{ taskId, status, index }` |
| GET | `/api/members` | 已登录 | 成员列表 |
| POST | `/api/members` | `member:manage` | 邀请成员（API 保留；**UI 未暴露**） |
| PATCH | `/api/members` | `member:manage` | 修改成员角色 |

响应体均为 JSON；错误形如 `{ error: string, code?: string }`。

---

## 13. 前端架构

### 13.1 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | `app/(auth)/login/page.tsx` | 登录；副标题随 `/api/health.mock` 区分 Mock/DB |
| `/` | `TasksApp` | 任务列表 + 看板（同页切换） |
| `/board` | 重定向 `/` | 兼容深链 |
| `/members` | `MembersPageView` | 成员列表；管理员可改角色 |
| `/tasks/[id]` | 任务详情路由 | 配合详情面板 |

### 13.2 核心组件

| 组件 | 职责 |
|------|------|
| `Sidebar` | 项目切换、导航、账号菜单（退出登录） |
| `TasksApp` | 页面状态：任务数据、筛选、视图模式、选中批量、详情面板 |
| `TaskListView` | 桌面表格 + 移动卡片；子任务展开 |
| `KanbanView` | `@dnd-kit` 四列看板 |
| `FilterBar` | 状态/优先级/负责人筛选 |
| `BatchBar` | 批量 → 待开始 / 进行中 / 审核中 / 已完成 |
| `TaskModal` | 新建/编辑 |
| `TaskDetailPanel` | 侧滑详情 + 日志 + 状态操作 |
| `project-context` | 当前 `projectId` 与项目列表 |

### 13.3 数据流

```
useSession → role → hasPermission → 控制 UI 能力
project-context → projectId → api.getTasks({ projectId })
api.* → fetch /api/* → setState → 子组件渲染
```

UI **不 import** `db.ts` / `mock-store`；所有变更经 REST 持久化。

---

## 14. 测试策略

采用 **Vitest** 对无 I/O 的领域逻辑做单元测试（`npm test`）：

| 文件 | 覆盖 | 用例数 |
|------|------|--------|
| `lib/permissions.test.ts` | RBAC 矩阵 | 12 |
| `lib/task-status.test.ts` | 状态机合法/非法流转 | 5 |
| `lib/task-form-validation.test.ts` | 标题与负责人必填 | 4 |

**合计 21 个用例**。未覆盖：Route Handler 集成测试、E2E、组件测试（可在后续用 Playwright 补充）。

测试意识体现：核心业务规则（权限、状态机、校验）有自动化回归，避免 AI 生成代码 silently 破坏约束。

---

## 15. 部署与环境变量

### 15.1 环境变量

| 变量 | 说明 |
|------|------|
| `USE_MOCK_DATA` | `true` 内存 Mock；`false` 强制 Postgres |
| `TASKMANAGER_POSTGRES_URL` | **优先**使用的专用库连接串（Vercel Storage 锁死 `POSTGRES_URL` 时用） |
| `POSTGRES_URL` | Vercel/Neon 默认注入 |
| `NEXTAUTH_URL` | 应用公网 URL |
| `NEXTAUTH_SECRET` | JWT 签名密钥 |

连接串解析：`lib/db-config.ts` → `TASKMANAGER_POSTGRES_URL` 优先于 `POSTGRES_URL`。

### 15.2 Vercel 部署流程

1. 导入 Git 仓库，配置 `USE_MOCK_DATA=false`、`NEXTAUTH_*`
2. Neon **独立项目**（勿与其它应用共用库）
3. 部署后于 SQL 控制台执行 `scripts/schema.sql`、`scripts/seed.sql`
4. 访问 `/api/health` 确认 `ok: true`、`seeded: true`
5. 使用 `admin / admin666` 登录

本地开发推荐 `USE_MOCK_DATA=true`，与线上读库互不影响。

### 15.3 可观测性

- `/api/health`：返回 `mock`、`database`、`tables`、`stats`、`connectionSource`
- 登录页：根据 health 展示 DB 未配置 / 未 seed 警告
- Service 异常：Route 层 `console.error` + 统一 JSON 错误体

---

## 16. 移动端适配

采用 **CSS 媒体查询 + 侧栏抽屉 JS**，非 viewport 整体缩放。

| 断点 | 布局 |
|------|------|
| `≤767px` | 抽屉侧栏；看板**纵向分列**；列表**卡片**；详情全屏 |
| `768–1023px` | 看板 2 列 |
| `≥1024px` | 桌面默认（侧栏固定 + 表格 + 四列看板） |

样式主文件：`app/taskflow.css`。详细测试清单与选择器索引见 [mobile-adaptation.md](mobile-adaptation.md)。

---

## 17. 扩展性设计

本节说明在当前表结构与分层下，如何演进常见能力，体现「数据模型可生长、前后端可替换」。

### 17.1 架构层扩展

| 扩展方向 | 现有基础 | 推荐演进路径 |
|----------|----------|--------------|
| **多工作区切换** | `workspaces` + `workspace_members` + API `AuthContext.workspaceId` | 侧栏增加工作区选择器；JWT 或 Session 存 `activeWorkspaceId`；所有查询已带 `workspace_id` |
| **OAuth / 企业 SSO** | `users.github_id` 作外部 id；NextAuth 多 Provider | 新 Provider 回调写/更新 `users`；首次登录 `INSERT workspace_members`；密码校验改走 Provider |
| **真实账号体系** | `users` 与 `mock-auth` 解耦登录 | 密码 hash 存 `users` 新列或独立 `credentials` 表；逐步废弃 `mock-auth` |
| **独立 BFF / 微服务** | Route Handler 已是 REST | 将 `lib/services` + `lib/db` 迁为独立 Node 服务；Next 仅保留 UI + 代理 |
| **替换前端** | `lib/api-client.ts`  typed 封装 | 保留 `/api/*`，换 React Native / Vue 壳即可 |
| **OpenAPI 文档** | JSON REST 已稳定 | 从 Route 类型生成 OpenAPI，供第三方集成 |

### 17.2 数据模型扩展

| 能力 | 表/字段改动 | 应用层改动 |
|------|-------------|------------|
| **自定义任务状态** | `tasks.status` CHECK 增枚举值；或新表 `task_status_defs(workspace_id, key)` | 扩展 `lib/task-status.ts` 为可配置图；看板列动态渲染 |
| **标签 / 自定义字段** | 新表 `task_labels`、`task_custom_fields` 或 JSONB 列 `tasks.metadata` | Service 校验 schema；列表筛选增参数 |
| **子任务超过 2 层** | DB 已支持任意 `parent_id` 深度 | 放宽 Service `MAX_DEPTH`；UI 树形缩进递归 |
| **任务评论** | `task_comments(task_id, user_id, body, created_at)` | 新 API `GET/POST /api/tasks/[id]/comments` |
| **附件** | `task_attachments` + 对象存储 URL | 上传走 Vercel Blob / S3；DB 存元数据 |
| **软删除** | `tasks.deleted_at`、`projects.deleted_at` | 查询加 `WHERE deleted_at IS NULL`；管理员回收站 |
| **全站审计** | 泛化 `task_activity_logs` → `audit_logs(entity_type, entity_id, …)` | 现有日志写入逻辑抽象为 `audit()` |
| **通知** | `notifications(user_id, type, payload, read_at)` | 状态变更时异步写通知；WebSocket 或轮询 |
| **邀请成员** | 无需改表；`workspace_members` 已支持 | UI 打开已有 `POST /api/members` |
| **项目级权限** | 新表 `project_members(project_id, user_id, role)` | 在 `task-service` 前增加项目级 `assertPermission` |

### 17.3 用户与协作扩展

```
当前：users ── workspace_members(role) ── workspaces
扩展：users ── workspace_members ── workspaces
              └── project_members (可选，项目内细粒度角色)
              └── team / department (可选，组织树)
```

- **一人多角色**：同一 `user_id` 在不同 `workspace_id` 可有不同 `role`（UNIQUE 约束已支持）
- **访客只读链接**：新表 `share_links(token, task_id, expires_at)` + 无 Session 只读 API
- **操作人追溯**：`tasks.created_by`、`logs.user_id` 已预留；报表按 `assignee_id` / `created_by` 聚合即可

### 17.4 性能与运维扩展

| 场景 | 方案 |
|------|------|
| 任务量增大 | 加复合索引 `(workspace_id, project_id, status)`；列表分页 `LIMIT/OFFSET` 或 cursor |
| 读多写少 | 看板/列表只读副本；Redis 缓存 `GET /api/tasks?projectId=` |
| 连接池 | Neon serverless 已适配；高并发可迁 PgBouncer |
|  schema 变更 | 保持 `schema.sql` 幂等；生产用 migration 工具（Drizzle / Prisma migrate） |
| 多区域 | Postgres 只读副本 + `TASKMANAGER_POSTGRES_URL` 按区域配置 |

### 17.5 与考查点对齐

| 考查点 | 扩展性体现 |
|--------|--------------|
| 全栈架构 — 数据模型 | 工作区 / 项目 / 任务 / 日志分层清晰；FK 与索引有文档与场景说明（§7） |
| 全栈架构 — 用户系统 | `users` + 外部 id + `workspace_members` 已为 OAuth 与多工作区预留 |
| 后端 — 字段/索引 | 9 个索引对应真实查询；§7.4 说明未建索引的演进方向 |
| 工程化 | 双模式 + Service 层使 Mock 与 DB 行为一致，扩展业务规则只改一处 |

---

## 18. 关键设计决策（供评审参考）

1. **双模式而非双代码库**：Route 内分支 Mock/DB，降低演示与生产差异。
2. **密码 Mock、角色 DB**：演示账号密码集中维护；接库后 RBAC 以数据库为准，避免 JWT 角色与 DB 不一致。
3. **Service 层仅 DB 模式**：Mock 由 `mock-store` 镜像规则，避免 Service 依赖内存状态。
4. **UI 与 API 解耦**：`api-client` 使 OpenDesign 原型或移动端壳可复用同一后端。
5. **状态机与 RBAC 纯函数 + 单测**：AI 生成代码最易出错处有测试兜底。
6. **子任务 2 层硬限制**：Service `MAX_DEPTH = 1`；DB 树形结构可扩展更深（§17.2）。
7. **DB 故障不降级 Mock 会话**：生产环境避免误用错误权限。
8. **github_id 作外部键**：演示/OAuth 统一映射入口，避免 username 变更影响关联。
9. **workspace 先于 project**：多租户边界在 workspace，project 仅组织任务，便于 SaaS 化。

---

## 19. 文档索引

| 文档 | 内容 |
|------|------|
| [reqirement.md](reqirement.md) | 产品需求与考查点 |
| [architecture.md](architecture.md) | 本文档 |
| [mobile-adaptation.md](mobile-adaptation.md) | 响应式实现细节 |
| [prompts/initial-implementation.md](prompts/initial-implementation.md) | AI 协作与迭代 Prompt 记录 |
| [README.md](../README.md) | 快速开始、演示账号、部署步骤 |
