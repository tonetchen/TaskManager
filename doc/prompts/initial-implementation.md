# 初始实现 Prompt

## 输入

- 需求文档：`doc/reqirement.md`
- 参考项目：GitStarHub（Next.js + NextAuth + Vercel Postgres）

## 输出约束

- 单仓库 Next.js 全栈
- REST API + Service + DB 三层
- RBAC 三角色、四状态状态机、子任务最多 2 层
- UI 仅占位，不做视觉设计

## 结构化要求

1. 先 schema + db + services + API
2. 页面仅验证 API 联通
3. 含 architecture.md、README、单元测试

## 迭代记录

- v1：用户要求对齐 GitStarHub 技术栈，Vercel 部署
- v2：用户要求先搭框架、UI 由 OpenDesign 原型驱动，暂缓 Kanban 拖拽与 shadcn 美化
- v3：接入 OpenDesign / TaskFlow 原型 UI；Kanban 拖拽（`@dnd-kit`）；Mock 与 Postgres 双模式（`USE_MOCK_DATA`）
- v4：RBAC 与需求对齐（仅 admin 创建/删任务；member 改状态；observer 只读）；角色以 DB `workspace_members` 为准
- v5：移动端真适配（列表卡片化、看板纵向分列、去除页面横滑）；成员页 loading；任务标题+负责人必填
- v6：提交前打磨——文档与代码同步、隐藏无实现 UI、批量栏补「待开始」、观察者隐藏勾选、账号菜单退出

## 人机协作要点

- **结构化约束**：先 schema → service → API → UI，避免 AI 一次生成不可维护的大文件
- **纠错**：识别 Mock/DB 双轨混用、DB 故障降级 Mock 会话、移动端 `min-width` 横滑等问题并人工修正
- **范围控制**：邀请成员、全站日志页等需求未写明的功能主动不做的或隐藏入口
