import { UI_STATUS_MAP, UiStatus } from "./taskflow-utils";
import {
  MemberRole,
  Project,
  Task,
  TaskActivityLog,
  TaskPriority,
  TaskStatus,
  WorkspaceMember,
} from "./types";
import { MOCK_WORKSPACE_ID } from "./mock-mode";

/** 原型中的团队成员（任务负责人 / 成员管理页） */
export const MOCK_TEAM = [
  { id: 1, name: "陈勋华", email: "chenxunhua1@jd.com", role: "admin" as MemberRole, joined: "2025-01-15" },
  { id: 2, name: "李明", email: "liming@jd.com", role: "member" as MemberRole, joined: "2025-02-01" },
  { id: 3, name: "王芳", email: "wangfang@jd.com", role: "member" as MemberRole, joined: "2025-02-10" },
  { id: 4, name: "赵刚", email: "zhaogang@jd.com", role: "member" as MemberRole, joined: "2025-03-01" },
  { id: 5, name: "陈静", email: "chenjing@jd.com", role: "observer" as MemberRole, joined: "2025-03-15" },
];

export const MOCK_PROJECTS: Project[] = [
  { id: 1, workspace_id: MOCK_WORKSPACE_ID, name: "电商平台重构" },
  { id: 2, workspace_id: MOCK_WORKSPACE_ID, name: "移动端 App v3" },
  { id: 3, workspace_id: MOCK_WORKSPACE_ID, name: "数据中台建设" },
];

const ASSIGNEE_IDS: Record<string, number> = {
  陈勋华: 1,
  李明: 2,
  王芳: 3,
  赵刚: 4,
};

type ProtoTask = {
  title: string;
  desc: string;
  status: UiStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  children?: Omit<ProtoTask, "desc" | "children">[];
};

/** 项目 1：电商平台重构 */
const ECOMMERCE_TASKS: ProtoTask[] = [
  {
    title: "用户登录页面重构",
    desc: "重构现有登录页面，采用新的设计语言，提升用户登录转化率。需要支持手机号登录、微信授权登录、账号密码登录三种方式。",
    status: "progress",
    priority: "high",
    assignee: "李明",
    due: "2025-06-15",
    children: [
      { title: "设计登录表单 UI", status: "done", priority: "medium", assignee: "王芳", due: "2025-05-30" },
      { title: "实现手机号验证码登录", status: "done", priority: "high", assignee: "李明", due: "2025-06-05" },
      { title: "接入微信 OAuth 授权", status: "progress", priority: "high", assignee: "李明", due: "2025-06-12" },
    ],
  },
  {
    title: "商品详情页性能优化",
    desc: "首屏加载时间从 3.2s 降至 1.5s 以内，优化图片懒加载和 API 调用链路。",
    status: "review",
    priority: "high",
    assignee: "赵刚",
    due: "2025-06-10",
    children: [
      { title: "图片 CDN 切换 + WebP 适配", status: "done", priority: "high", assignee: "赵刚", due: "2025-06-01" },
      { title: "接口合并与缓存优化", status: "review", priority: "medium", assignee: "赵刚", due: "2025-06-08" },
    ],
  },
  {
    title: "支付流程安全审计",
    desc: "对接第三方支付安全检测工具，输出安全评估报告并修复高危漏洞。",
    status: "todo",
    priority: "high",
    assignee: "陈勋华",
    due: "2025-06-20",
  },
  {
    title: "订单列表分页重构",
    desc: "将订单列表从前端分页改为服务端分页，支持游标分页方式，解决大数据量下的性能瓶颈。",
    status: "progress",
    priority: "medium",
    assignee: "李明",
    due: "2025-06-18",
    children: [
      { title: "后端游标分页 API 开发", status: "progress", priority: "medium", assignee: "李明", due: "2025-06-12" },
      { title: "前端列表组件适配", status: "todo", priority: "low", assignee: "王芳", due: "2025-06-16" },
    ],
  },
  {
    title: "搜索功能 Elasticsearch 迁移",
    desc: "将现有 MySQL LIKE 搜索替换为 ES，支持模糊搜索、拼音搜索和搜索建议。",
    status: "todo",
    priority: "medium",
    assignee: "赵刚",
    due: "2025-07-01",
  },
  {
    title: "用户反馈系统搭建",
    desc: "开发内嵌反馈组件，支持文字+截图提交，自动关联当前页面和用户信息。",
    status: "done",
    priority: "low",
    assignee: "王芳",
    due: "2025-05-25",
  },
  {
    title: "移动端底部导航优化",
    desc: "重新设计底部 Tab Bar 交互，增加动效反馈，优化触控热区。",
    status: "progress",
    priority: "medium",
    assignee: "王芳",
    due: "2025-06-22",
  },
  {
    title: "API 限流与熔断机制",
    desc: "基于 Sentinel 实现 API 限流，配合 CircuitBreaker 实现核心接口的熔断降级。",
    status: "todo",
    priority: "high",
    assignee: "陈勋华",
    due: "2025-06-28",
  },
  {
    title: "国际化多语言支持",
    desc: "接入 i18n 框架，支持中文、英文、日文三种语言切换，抽取所有硬编码文案。",
    status: "todo",
    priority: "low",
    assignee: "李明",
    due: "2025-07-15",
  },
  {
    title: "数据看板 — 运营日报",
    desc: "搭建运营数据看板，展示 DAU、GMV、转化率等核心指标，支持日/周/月维度切换。",
    status: "review",
    priority: "medium",
    assignee: "赵刚",
    due: "2025-06-08",
  },
  {
    title: "消息推送系统集成",
    desc: "对接极光推送 SDK，支持站内信、Push 通知和短信三个通道的消息触达。",
    status: "progress",
    priority: "medium",
    assignee: "陈勋华",
    due: "2025-06-25",
  },
  {
    title: "自动化测试框架搭建",
    desc: "基于 Playwright 搭建 E2E 测试框架，覆盖核心购物流程（登录→搜索→下单→支付）。",
    status: "todo",
    priority: "low",
    assignee: "王芳",
    due: "2025-07-10",
  },
];

/** 项目 2：移动端 App v3 */
const MOBILE_APP_TASKS: ProtoTask[] = [
  {
    title: "首页 Feed 流重构",
    desc: "采用瀑布流 + 骨架屏，支持个性化推荐卡片与下拉刷新。",
    status: "progress",
    priority: "high",
    assignee: "王芳",
    due: "2025-06-20",
    children: [
      { title: "Feed 卡片组件库", status: "done", priority: "medium", assignee: "王芳", due: "2025-06-05" },
      { title: "推荐接口联调", status: "progress", priority: "high", assignee: "李明", due: "2025-06-15" },
    ],
  },
  {
    title: "Dark Mode 全站适配",
    desc: "统一 Design Token，完成 120+ 页面深色模式适配与切换动画。",
    status: "review",
    priority: "medium",
    assignee: "王芳",
    due: "2025-06-12",
  },
  {
    title: "推送权限引导流程",
    desc: "设计分步引导弹窗，提升 Push 授权率，支持 A/B 实验配置。",
    status: "todo",
    priority: "high",
    assignee: "李明",
    due: "2025-06-25",
  },
  {
    title: "React Native 升级 0.76",
    desc: "升级 RN 与 Hermes 引擎，修复 Breaking Changes，回归核心链路。",
    status: "progress",
    priority: "high",
    assignee: "赵刚",
    due: "2025-07-05",
    children: [
      { title: "依赖包兼容性排查", status: "done", priority: "high", assignee: "赵刚", due: "2025-06-08" },
      { title: "iOS / Android 双端回归", status: "progress", priority: "medium", assignee: "赵刚", due: "2025-06-28" },
    ],
  },
  {
    title: "离线缓存策略",
    desc: "商品详情与购物车支持弱网离线读写，冲突合并策略设计。",
    status: "todo",
    priority: "medium",
    assignee: "陈勋华",
    due: "2025-07-10",
  },
  {
    title: "App Store 审核材料更新",
    desc: "更新隐私说明、截图与审核账号，配合 v3.0 大版本提审。",
    status: "done",
    priority: "low",
    assignee: "陈静",
    due: "2025-05-28",
  },
  {
    title: "生物识别登录",
    desc: "接入 Face ID / 指纹快捷登录，与账号密码登录并存。",
    status: "todo",
    priority: "medium",
    assignee: "李明",
    due: "2025-07-18",
  },
  {
    title: "Crash 监控与符号化",
    desc: "接入 Sentry，配置 dSYM / ProGuard 符号表自动上传。",
    status: "review",
    priority: "high",
    assignee: "赵刚",
    due: "2025-06-18",
  },
];

/** 项目 3：数据中台建设 */
const DATA_PLATFORM_TASKS: ProtoTask[] = [
  {
    title: "用户行为埋点规范 v2",
    desc: "统一事件命名、属性字典与 SDK 上报格式，覆盖 Web / App 双端。",
    status: "progress",
    priority: "high",
    assignee: "陈勋华",
    due: "2025-06-22",
    children: [
      { title: "埋点文档与校验工具", status: "done", priority: "medium", assignee: "王芳", due: "2025-06-01" },
      { title: "存量页面补埋点", status: "progress", priority: "high", assignee: "李明", due: "2025-06-18" },
    ],
  },
  {
    title: "实时数仓 Flink 任务",
    desc: "搭建订单、流量实时明细层，延迟控制在 30s 以内。",
    status: "review",
    priority: "high",
    assignee: "赵刚",
    due: "2025-06-15",
  },
  {
    title: "指标字典 v2",
    desc: "梳理 200+ 核心业务指标定义、口径与负责人，支持搜索与版本管理。",
    status: "todo",
    priority: "medium",
    assignee: "陈静",
    due: "2025-07-01",
  },
  {
    title: "BI 报表权限模型",
    desc: "行级 + 列级权限控制，对接组织架构与角色继承。",
    status: "progress",
    priority: "high",
    assignee: "陈勋华",
    due: "2025-06-28",
  },
  {
    title: "数据质量监控告警",
    desc: "空值率、重复率、波动率规则配置，异常钉钉群通知。",
    status: "todo",
    priority: "medium",
    assignee: "赵刚",
    due: "2025-07-08",
  },
  {
    title: "元数据血缘图谱",
    desc: "采集 Hive / Kafka / API 血缘，可视化上下游依赖与影响分析。",
    status: "todo",
    priority: "low",
    assignee: "李明",
    due: "2025-07-20",
  },
  {
    title: "用户标签体系搭建",
    desc: "RFM、品类偏好、生命周期标签计算与 T+1 更新调度。",
    status: "done",
    priority: "medium",
    assignee: "王芳",
    due: "2025-05-20",
  },
  {
    title: "数据 API 网关",
    desc: "统一对外数据服务入口，限流、鉴权、审计日志一体化。",
    status: "progress",
    priority: "high",
    assignee: "陈勋华",
    due: "2025-06-30",
  },
];

const PROJECT_TASK_SETS: Record<number, ProtoTask[]> = {
  1: ECOMMERCE_TASKS,
  2: MOBILE_APP_TASKS,
  3: DATA_PLATFORM_TASKS,
};

const NOW = new Date("2025-05-21T08:00:00.000Z");

function toApiStatus(ui: UiStatus): TaskStatus {
  return UI_STATUS_MAP[ui];
}

function buildTask(
  id: number,
  projectId: number,
  parentId: number | null,
  proto: ProtoTask | Omit<ProtoTask, "desc" | "children">,
  description: string | null,
  createdBy: number,
  boardOrder = 0
): Task {
  const assigneeId = ASSIGNEE_IDS[proto.assignee] ?? null;
  return {
    id,
    workspace_id: MOCK_WORKSPACE_ID,
    project_id: projectId,
    parent_id: parentId,
    title: proto.title,
    description,
    priority: proto.priority,
    status: toApiStatus(proto.status),
    board_order: boardOrder,
    due_date: proto.due,
    assignee_id: assigneeId,
    assignee_username: proto.assignee,
    created_by: createdBy,
    created_at: NOW,
    updated_at: NOW,
  };
}

export function buildInitialTasks(): Task[] {
  const tasks: Task[] = [];
  let nextRootId = 1;
  let nextSubId = 1000;

  for (const project of MOCK_PROJECTS) {
    const protos = PROJECT_TASK_SETS[project.id] ?? [];
    const statusCounters: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };

    protos.forEach((proto) => {
      const rootId = nextRootId++;
      const status = toApiStatus(proto.status);
      const boardOrder = statusCounters[status]++;
      tasks.push(buildTask(rootId, project.id, null, proto, proto.desc, 1, boardOrder));

      proto.children?.forEach((child) => {
        nextSubId += 1;
        tasks.push(buildTask(nextSubId, project.id, rootId, child, null, 1));
      });
    });
  }

  return tasks;
}

export function buildInitialMembers(): WorkspaceMember[] {
  return MOCK_TEAM.map((m, i) => ({
    id: i + 1,
    workspace_id: MOCK_WORKSPACE_ID,
    user_id: m.id,
    role: m.role,
    username: m.name,
    email: m.email,
    avatar_url: null,
    created_at: new Date(m.joined),
    updated_at: new Date(m.joined),
  }));
}

export function buildSampleLogs(taskId: number, taskTitle: string): TaskActivityLog[] {
  return [
    {
      id: taskId * 10,
      task_id: taskId,
      user_id: 2,
      username: "李明",
      action: "created",
      from_status: null,
      to_status: "todo",
      detail: `创建任务: ${taskTitle}`,
      created_at: NOW,
    },
    {
      id: taskId * 10 + 1,
      task_id: taskId,
      user_id: 2,
      username: "李明",
      action: "status_changed",
      from_status: "todo",
      to_status: "in_progress",
      detail: null,
      created_at: new Date("2025-05-22T10:00:00.000Z"),
    },
  ];
}

export function getMockProjectById(projectId: number): Project | undefined {
  return MOCK_PROJECTS.find((p) => p.id === projectId);
}
