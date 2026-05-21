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
