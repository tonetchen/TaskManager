# 移动端适配说明

## 设计目标

本项目的移动端方案通过断点切换布局结构（抽屉导航、看板横滑、列表卡片化、全屏详情等）实现，不使用 `transform: scale()` 整体缩放。

## 断点与 Design Token

| Token / 断点 | 值 | 说明 |
|--------------|-----|------|
| `--mobile-header-h` | `52px` | 移动端顶栏高度 |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | iOS 安全区 |
| Desktop | `>= 1024px` | 默认桌面布局 |
| Tablet | `768px – 1023px` | 看板 2 列网格 |
| Mobile | `<= 767px` | 抽屉 + 卡片 + 看板横滑 |
| Mobile SM | `<= 480px` | 视图切换仅图标、批量栏更紧凑 |

Viewport 配置见 [`app/layout.tsx`](../app/layout.tsx)：`width=device-width, initial-scale=1, viewport-fit=cover`。

## 页面适配矩阵

| 页面 / 模块 | Desktop | Mobile (<=767px) |
|-------------|---------|------------------|
| 登录 | 居中卡片 400px | 全宽卡片 + 16px 边距，输入框 16px 防 iOS 缩放 |
| 侧栏 | 固定 240px | 左侧抽屉 + 遮罩，汉堡菜单打开 |
| 任务顶栏 | 标题 \| 筛选 \| 操作 | 两行：标题+操作 / 筛选横滑 |
| 看板 | 4 列网格 | 横向 scroll-snap，每列约 88vw |
| 列表 | 表格（与原型一致） | 横向滚动保留完整列 |
| 详情面板 | 420px 右侧滑入 | 100% 全屏宽 |
| 弹窗 | 居中 modal | 近全屏，表单单列 |
| 批量操作栏 | 底部居中浮条 | 贴底全宽，支持 safe-area |
| 成员列表 | 4 列表格 | 卡片堆叠，表头隐藏 |
| 权限矩阵 | 表格 | 横向滚动容器 |

## 交互说明

### 侧栏抽屉

- 移动端顶栏左侧汉堡按钮 → 打开侧栏
- 点击遮罩或导航链接 → 关闭
- 路由变化时自动关闭（`usePathname`）

### 看板横滑

- 四列状态改为水平滚动，每列 `scroll-snap-align: start`
- 触控拖拽（`@dnd-kit` + `PointerSensor`）在移动端继续可用
- 列内卡片仍支持排序与跨列改状态

### 列表表格

- 桌面端与原型一致：`<table class="task-table">`，含勾选、展开、状态/优先级 badge、负责人、截止日期
- 移动端表格横向滚动（`min-width: 680px`），避免字段转置卡片

### 筛选下拉

- 移动端下拉菜单全宽对齐筛选栏
- 点击外部区域关闭菜单

## 实现文件索引

| 文件 | 改动 |
|------|------|
| [`app/layout.tsx`](../app/layout.tsx) | Viewport 元信息 |
| [`app/taskflow.css`](../app/taskflow.css) | 断点、`@media` 规则、mobile-header、抽屉样式 |
| [`app/(dashboard)/layout.tsx`](../app/(dashboard)/layout.tsx) | 移动端顶栏、侧栏开关状态 |
| [`components/taskflow/Sidebar.tsx`](../components/taskflow/Sidebar.tsx) | `open` / `onNavigate` props |
| [`components/taskflow/icons.tsx`](../components/taskflow/icons.tsx) | `IconMenu` |
| [`components/taskflow/TasksApp.tsx`](../components/taskflow/TasksApp.tsx) | 顶栏 `topbar-primary` + `topbar-filters` 结构 |
| [`components/taskflow/FilterBar.tsx`](../components/taskflow/FilterBar.tsx) | `filter-dropdown`、点击外部关闭 |
| [`components/taskflow/TaskListView.tsx`](../components/taskflow/TaskListView.tsx) | `data-label` 卡片化 |
| [`components/taskflow/MembersView.tsx`](../components/taskflow/MembersView.tsx) | `topbar--simple`、权限表滚动 |
| [`app/(auth)/login/page.tsx`](../app/(auth)/login/page.tsx) | `login-page` / `login-card` |

## 测试清单

### 工具

Chrome DevTools → Toggle device toolbar

推荐视口：

- iPhone SE：375 × 667
- iPhone 14 Pro：390 × 844
- iPad：768 × 1024

### 必测路径

1. **登录**：表单可输入、按钮可点、无横向溢出
2. **侧栏**：汉堡打开/关闭，跳转成员页后抽屉关闭
3. **看板**：左右滑动切换列，拖拽改状态/排序
4. **列表**：卡片展示字段标签，点击进详情
5. **详情**：全屏面板，状态流转可换行
6. **成员页**：成员卡片、权限矩阵可横滑
7. **批量栏**：列表多选后出现，按钮可换行
8. **横竖屏**：旋转后布局不崩溃

### 验收标准

- 页面级无意外横向滚动条（看板列、筛选 chips、权限表局部横滑除外）
- 主要可点击区域触控目标 ≥ 44px（汉堡按钮）
- `npm run build` 通过

## 已知限制

- `/board`、`/tasks/[id]` 路由重定向至 `/`
- Tablet 768–1023px 看板为 2 列网格，非横滑（介于桌面与手机之间）
- 真实数据库模式暂未实现多项目表结构，仅 Mock 模式支持三项目切换
