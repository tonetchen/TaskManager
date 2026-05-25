# 移动端适配说明

## 设计目标

本项目的移动端方案通过断点切换布局结构（抽屉导航、看板纵向堆叠、列表卡片化、全屏详情等）实现，**不使用** `transform: scale()` 整体缩放，**避免页面级横向滚动条**。

## 断点与 Design Token

| Token / 断点 | 值 | 说明 |
|--------------|-----|------|
| `--mobile-header-h` | `52px` | 移动端顶栏高度 |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | iOS 安全区 |
| Desktop | `>= 1024px` | 默认桌面布局 |
| Tablet | `768px – 1023px` | 看板 2 列网格 |
| Mobile | `<= 767px` | 抽屉 + 卡片 + 看板纵向分列 |
| Mobile SM | `<= 480px` | 视图切换仅图标、批量栏更紧凑 |

Viewport 配置见 [`app/layout.tsx`](../app/layout.tsx)：`width=device-width, initial-scale=1, viewport-fit=cover`。

## 页面适配矩阵

| 页面 / 模块 | Desktop | Mobile (<=767px) |
|-------------|---------|------------------|
| 登录 | 居中卡片 400px | 全宽卡片 + 16px 边距，输入框 16px 防 iOS 缩放 |
| 侧栏 | 固定 240px | 左侧抽屉 + 遮罩，汉堡菜单打开；账号区点击弹出菜单再退出 |
| 任务顶栏 | 标题 \| 筛选 \| 操作 | 两行：标题+操作 / 筛选换行 |
| 看板 | 4 列网格 | **四列纵向堆叠**，列内卡片可滚动 |
| 列表 | 表格 | **卡片列表**（状态/优先级/负责人/截止日期） |
| 详情面板 | 420px 右侧滑入 | 100% 全屏宽 |
| 弹窗 | 居中 modal | 近全屏，表单单列 |
| 批量操作栏 | 底部居中浮条 | 贴底全宽，支持 safe-area |
| 成员列表 | 4 列表格 | 卡片堆叠，表头隐藏 |
| 权限矩阵 | 表格 | 横向滚动容器（仅此区域允许局部横滑） |

## 交互说明

### 侧栏抽屉

- 移动端顶栏左侧汉堡按钮 → 打开侧栏
- 点击遮罩或导航链接 → 关闭
- 路由变化时自动关闭（`usePathname`）

### 看板（移动端）

- 四个状态列改为**纵向排列**，整页纵向滚动
- 每列内部任务列表 `max-height: min(420px, 50vh)` 可滚动
- 触控拖拽（`@dnd-kit` + `PointerSensor`）继续可用

### 列表（移动端）

- 桌面端：`<table class="task-table">`
- 移动端：`.task-list-mobile` 卡片，`.task-list-desktop` 隐藏
- 无表格 `min-width` 横滑

### 筛选

- 筛选 chips **换行**（`flex-wrap`），不用横向滚动

## 实现文件索引

| 文件 | 改动 |
|------|------|
| [`app/layout.tsx`](../app/layout.tsx) | Viewport 元信息 |
| [`app/taskflow.css`](../app/taskflow.css) | 断点、`@media`、卡片列表、看板纵向布局 |
| [`app/(dashboard)/layout.tsx`](../app/(dashboard)/layout.tsx) | 移动端顶栏、侧栏开关 |
| [`components/taskflow/Sidebar.tsx`](../components/taskflow/Sidebar.tsx) | 抽屉、`open` / `onNavigate`、账号菜单 |
| [`components/taskflow/TaskListView.tsx`](../components/taskflow/TaskListView.tsx) | 桌面表格 + 移动卡片双布局 |
| [`components/taskflow/KanbanView.tsx`](../components/taskflow/KanbanView.tsx) | 看板 DnD |
| [`components/taskflow/FilterBar.tsx`](../components/taskflow/FilterBar.tsx) | 下拉、点击外部关闭 |

## 测试清单

### 工具

Chrome DevTools → Toggle device toolbar

推荐视口：iPhone SE 375×667、iPhone 14 Pro 390×844、iPad 768×1024

### 必测路径

1. **登录**：表单可输入、无整页横向溢出
2. **侧栏**：汉堡打开/关闭；账号菜单退出登录
3. **看板**：纵向浏览四列，拖拽改状态
4. **列表**：卡片展示，点击进详情
5. **详情**：全屏面板，状态流转可换行
6. **成员页**：loading、成员卡片、权限矩阵
7. **批量栏**：admin/member 多选后出现（含「待开始」）
8. **观察者**：无勾选框、无新建/编辑入口

### 验收标准

- **页面级无意外横向滚动条**（权限矩阵局部横滑除外）
- 主要可点击区域触控目标 ≥ 44px（汉堡、侧栏账号）
- `npm run build` 通过

## 已知限制

- `/board`、`/tasks/[id]` 重定向至 `/`
- Tablet 768–1023px 看板为 2 列网格
