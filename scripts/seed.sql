-- 演示数据：用户、工作区、项目、任务（与 lib/mock-data.ts 一致，可重复执行）
-- ========== 用户（登录账号 + 任务负责人） ==========
INSERT INTO users (github_id, username, email)
VALUES
  (900001, 'admin', 'admin@mock.local'),
  (900002, 'member', 'member@mock.local'),
  (900003, 'observer', 'observer@mock.local'),
  (901001, '陈勋华', 'chenxunhua1@jd.com'),
  (901002, '李明', 'liming@jd.com'),
  (901003, '王芳', 'wangfang@jd.com'),
  (901004, '赵刚', 'zhaogang@jd.com'),
  (901005, '陈静', 'chenjing@jd.com')
ON CONFLICT (github_id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email;

-- ========== 工作区（admin 账号） ==========
INSERT INTO workspaces (name, created_by)
SELECT '默认工作区', u.id
FROM users u
WHERE u.github_id = 900001
  AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.created_by = u.id);

-- ========== 工作区成员（与 projects 使用同一工作区） ==========
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT ws.id, u.id, m.role
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id FROM workspaces w ORDER BY w.id ASC LIMIT 1
    )
  ) AS id
) ws
INNER JOIN users u ON u.github_id IN (900001, 900002, 900003, 901001, 901002, 901003, 901004, 901005)
INNER JOIN (
  VALUES
    (900001::bigint, 'admin'),
    (900002::bigint, 'member'),
    (900003::bigint, 'observer'),
    (901001::bigint, 'admin'),
    (901002::bigint, 'member'),
    (901003::bigint, 'member'),
    (901004::bigint, 'member'),
    (901005::bigint, 'observer')
) AS m(github_id, role) ON u.github_id = m.github_id
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- ========== 项目（与 Mock 数据同名） ==========
INSERT INTO projects (workspace_id, name)
SELECT ws.id, p.name
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
CROSS JOIN (
  VALUES
    ('电商平台重构'),
    ('移动端 App v3'),
    ('数据中台建设')
) AS p(name)
WHERE NOT EXISTS (
  SELECT 1 FROM projects pr WHERE pr.workspace_id = ws.id AND pr.name = p.name
);

-- ========== 任务（含子任务） ==========
-- 电商平台重构 / 用户登录页面重构
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '用户登录页面重构',
  '重构现有登录页面，采用新的设计语言，提升用户登录转化率。需要支持手机号登录、微信授权登录、账号密码登录三种方式。',
  'high',
  'in_progress',
  0,
  '2025-06-15'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '用户登录页面重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 用户登录页面重构 > 设计登录表单 UI
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '用户登录页面重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '设计登录表单 UI',
  NULL,
  'medium',
  'done',
  0,
  '2025-05-30'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '设计登录表单 UI' AND parent.title = '用户登录页面重构' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 用户登录页面重构 > 实现手机号验证码登录
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '用户登录页面重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '实现手机号验证码登录',
  NULL,
  'high',
  'done',
  0,
  '2025-06-05'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '实现手机号验证码登录' AND parent.title = '用户登录页面重构' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 用户登录页面重构 > 接入微信 OAuth 授权
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '用户登录页面重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '接入微信 OAuth 授权',
  NULL,
  'high',
  'in_progress',
  0,
  '2025-06-12'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '接入微信 OAuth 授权' AND parent.title = '用户登录页面重构' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 商品详情页性能优化
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '商品详情页性能优化',
  '首屏加载时间从 3.2s 降至 1.5s 以内，优化图片懒加载和 API 调用链路。',
  'high',
  'in_review',
  0,
  '2025-06-10'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '商品详情页性能优化' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 商品详情页性能优化 > 图片 CDN 切换 + WebP 适配
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '商品详情页性能优化' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '图片 CDN 切换 + WebP 适配',
  NULL,
  'high',
  'done',
  0,
  '2025-06-01'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '图片 CDN 切换 + WebP 适配' AND parent.title = '商品详情页性能优化' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 商品详情页性能优化 > 接口合并与缓存优化
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '商品详情页性能优化' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '接口合并与缓存优化',
  NULL,
  'medium',
  'in_review',
  0,
  '2025-06-08'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '接口合并与缓存优化' AND parent.title = '商品详情页性能优化' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 支付流程安全审计
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '支付流程安全审计',
  '对接第三方支付安全检测工具，输出安全评估报告并修复高危漏洞。',
  'high',
  'todo',
  0,
  '2025-06-20'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '支付流程安全审计' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 订单列表分页重构
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '订单列表分页重构',
  '将订单列表从前端分页改为服务端分页，支持游标分页方式，解决大数据量下的性能瓶颈。',
  'medium',
  'in_progress',
  1,
  '2025-06-18'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '订单列表分页重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 订单列表分页重构 > 后端游标分页 API 开发
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '订单列表分页重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '后端游标分页 API 开发',
  NULL,
  'medium',
  'in_progress',
  0,
  '2025-06-12'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '后端游标分页 API 开发' AND parent.title = '订单列表分页重构' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 订单列表分页重构 > 前端列表组件适配
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '订单列表分页重构' AND p.name = '电商平台重构' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '前端列表组件适配',
  NULL,
  'low',
  'todo',
  0,
  '2025-06-16'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '前端列表组件适配' AND parent.title = '订单列表分页重构' AND p.name = '电商平台重构'
);

-- 电商平台重构 / 搜索功能 Elasticsearch 迁移
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '搜索功能 Elasticsearch 迁移',
  '将现有 MySQL LIKE 搜索替换为 ES，支持模糊搜索、拼音搜索和搜索建议。',
  'medium',
  'todo',
  1,
  '2025-07-01'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '搜索功能 Elasticsearch 迁移' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 用户反馈系统搭建
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '用户反馈系统搭建',
  '开发内嵌反馈组件，支持文字+截图提交，自动关联当前页面和用户信息。',
  'low',
  'done',
  0,
  '2025-05-25'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '用户反馈系统搭建' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 移动端底部导航优化
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '移动端底部导航优化',
  '重新设计底部 Tab Bar 交互，增加动效反馈，优化触控热区。',
  'medium',
  'in_progress',
  2,
  '2025-06-22'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '移动端底部导航优化' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / API 限流与熔断机制
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'API 限流与熔断机制',
  '基于 Sentinel 实现 API 限流，配合 CircuitBreaker 实现核心接口的熔断降级。',
  'high',
  'todo',
  2,
  '2025-06-28'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'API 限流与熔断机制' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 国际化多语言支持
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '国际化多语言支持',
  '接入 i18n 框架，支持中文、英文、日文三种语言切换，抽取所有硬编码文案。',
  'low',
  'todo',
  3,
  '2025-07-15'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '国际化多语言支持' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 数据看板 — 运营日报
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '数据看板 — 运营日报',
  '搭建运营数据看板，展示 DAU、GMV、转化率等核心指标，支持日/周/月维度切换。',
  'medium',
  'in_review',
  1,
  '2025-06-08'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '数据看板 — 运营日报' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 消息推送系统集成
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '消息推送系统集成',
  '对接极光推送 SDK，支持站内信、Push 通知和短信三个通道的消息触达。',
  'medium',
  'in_progress',
  3,
  '2025-06-25'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '消息推送系统集成' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 电商平台重构 / 自动化测试框架搭建
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '自动化测试框架搭建',
  '基于 Playwright 搭建 E2E 测试框架，覆盖核心购物流程（登录→搜索→下单→支付）。',
  'low',
  'todo',
  4,
  '2025-07-10'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '电商平台重构'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '自动化测试框架搭建' AND p.name = '电商平台重构' AND t.parent_id IS NULL
);

-- 移动端 App v3 / 首页 Feed 流重构
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '首页 Feed 流重构',
  '采用瀑布流 + 骨架屏，支持个性化推荐卡片与下拉刷新。',
  'high',
  'in_progress',
  0,
  '2025-06-20'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '首页 Feed 流重构' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / 首页 Feed 流重构 > Feed 卡片组件库
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '首页 Feed 流重构' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
      LIMIT 1
    ),
  'Feed 卡片组件库',
  NULL,
  'medium',
  'done',
  0,
  '2025-06-05'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'Feed 卡片组件库' AND parent.title = '首页 Feed 流重构' AND p.name = '移动端 App v3'
);

-- 移动端 App v3 / 首页 Feed 流重构 > 推荐接口联调
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '首页 Feed 流重构' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '推荐接口联调',
  NULL,
  'high',
  'in_progress',
  0,
  '2025-06-15'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '推荐接口联调' AND parent.title = '首页 Feed 流重构' AND p.name = '移动端 App v3'
);

-- 移动端 App v3 / Dark Mode 全站适配
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'Dark Mode 全站适配',
  '统一 Design Token，完成 120+ 页面深色模式适配与切换动画。',
  'medium',
  'in_review',
  0,
  '2025-06-12'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'Dark Mode 全站适配' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / 推送权限引导流程
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '推送权限引导流程',
  '设计分步引导弹窗，提升 Push 授权率，支持 A/B 实验配置。',
  'high',
  'todo',
  0,
  '2025-06-25'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '推送权限引导流程' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / React Native 升级 0.76
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'React Native 升级 0.76',
  '升级 RN 与 Hermes 引擎，修复 Breaking Changes，回归核心链路。',
  'high',
  'in_progress',
  1,
  '2025-07-05'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'React Native 升级 0.76' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / React Native 升级 0.76 > 依赖包兼容性排查
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = 'React Native 升级 0.76' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '依赖包兼容性排查',
  NULL,
  'high',
  'done',
  0,
  '2025-06-08'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '依赖包兼容性排查' AND parent.title = 'React Native 升级 0.76' AND p.name = '移动端 App v3'
);

-- 移动端 App v3 / React Native 升级 0.76 > iOS / Android 双端回归
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = 'React Native 升级 0.76' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
      LIMIT 1
    ),
  'iOS / Android 双端回归',
  NULL,
  'medium',
  'in_progress',
  0,
  '2025-06-28'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'iOS / Android 双端回归' AND parent.title = 'React Native 升级 0.76' AND p.name = '移动端 App v3'
);

-- 移动端 App v3 / 离线缓存策略
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '离线缓存策略',
  '商品详情与购物车支持弱网离线读写，冲突合并策略设计。',
  'medium',
  'todo',
  1,
  '2025-07-10'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '离线缓存策略' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / App Store 审核材料更新
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'App Store 审核材料更新',
  '更新隐私说明、截图与审核账号，配合 v3.0 大版本提审。',
  'low',
  'done',
  0,
  '2025-05-28'::date,
  (SELECT id FROM users WHERE username = '陈静' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'App Store 审核材料更新' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / 生物识别登录
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '生物识别登录',
  '接入 Face ID / 指纹快捷登录，与账号密码登录并存。',
  'medium',
  'todo',
  2,
  '2025-07-18'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '生物识别登录' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 移动端 App v3 / Crash 监控与符号化
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'Crash 监控与符号化',
  '接入 Sentry，配置 dSYM / ProGuard 符号表自动上传。',
  'high',
  'in_review',
  1,
  '2025-06-18'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '移动端 App v3'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'Crash 监控与符号化' AND p.name = '移动端 App v3' AND t.parent_id IS NULL
);

-- 数据中台建设 / 用户行为埋点规范 v2
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '用户行为埋点规范 v2',
  '统一事件命名、属性字典与 SDK 上报格式，覆盖 Web / App 双端。',
  'high',
  'in_progress',
  0,
  '2025-06-22'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '用户行为埋点规范 v2' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 用户行为埋点规范 v2 > 埋点文档与校验工具
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '用户行为埋点规范 v2' AND p.name = '数据中台建设' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '埋点文档与校验工具',
  NULL,
  'medium',
  'done',
  0,
  '2025-06-01'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '埋点文档与校验工具' AND parent.title = '用户行为埋点规范 v2' AND p.name = '数据中台建设'
);

-- 数据中台建设 / 用户行为埋点规范 v2 > 存量页面补埋点
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  (
      SELECT t.id FROM tasks t
      INNER JOIN projects p ON p.id = t.project_id
      WHERE t.title = '用户行为埋点规范 v2' AND p.name = '数据中台建设' AND t.parent_id IS NULL
      LIMIT 1
    ),
  '存量页面补埋点',
  NULL,
  'high',
  'in_progress',
  0,
  '2025-06-18'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN tasks parent ON parent.id = t.parent_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '存量页面补埋点' AND parent.title = '用户行为埋点规范 v2' AND p.name = '数据中台建设'
);

-- 数据中台建设 / 实时数仓 Flink 任务
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '实时数仓 Flink 任务',
  '搭建订单、流量实时明细层，延迟控制在 30s 以内。',
  'high',
  'in_review',
  0,
  '2025-06-15'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '实时数仓 Flink 任务' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 指标字典 v2
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '指标字典 v2',
  '梳理 200+ 核心业务指标定义、口径与负责人，支持搜索与版本管理。',
  'medium',
  'todo',
  0,
  '2025-07-01'::date,
  (SELECT id FROM users WHERE username = '陈静' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '指标字典 v2' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / BI 报表权限模型
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  'BI 报表权限模型',
  '行级 + 列级权限控制，对接组织架构与角色继承。',
  'high',
  'in_progress',
  1,
  '2025-06-28'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = 'BI 报表权限模型' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 数据质量监控告警
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '数据质量监控告警',
  '空值率、重复率、波动率规则配置，异常钉钉群通知。',
  'medium',
  'todo',
  1,
  '2025-07-08'::date,
  (SELECT id FROM users WHERE username = '赵刚' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '数据质量监控告警' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 元数据血缘图谱
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '元数据血缘图谱',
  '采集 Hive / Kafka / API 血缘，可视化上下游依赖与影响分析。',
  'low',
  'todo',
  2,
  '2025-07-20'::date,
  (SELECT id FROM users WHERE username = '李明' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '元数据血缘图谱' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 用户标签体系搭建
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '用户标签体系搭建',
  'RFM、品类偏好、生命周期标签计算与 T+1 更新调度。',
  'medium',
  'done',
  0,
  '2025-05-20'::date,
  (SELECT id FROM users WHERE username = '王芳' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '用户标签体系搭建' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);

-- 数据中台建设 / 数据 API 网关
INSERT INTO tasks (
  workspace_id, project_id, parent_id, title, description,
  priority, status, board_order, due_date, assignee_id, created_by
)
SELECT
  ws.id,
  p.id,
  NULL,
  '数据 API 网关',
  '统一对外数据服务入口，限流、鉴权、审计日志一体化。',
  'high',
  'in_progress',
  2,
  '2025-06-30'::date,
  (SELECT id FROM users WHERE username = '陈勋华' LIMIT 1),
  (SELECT id FROM users WHERE github_id = 900001 LIMIT 1)
FROM (
  SELECT COALESCE(
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      INNER JOIN users admin ON admin.id = wm.user_id AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    ),
    (
      SELECT w.id
      FROM workspaces w
      INNER JOIN users admin ON admin.id = w.created_by AND admin.github_id = 900001
      ORDER BY w.id ASC
      LIMIT 1
    )
  ) AS id
) ws
INNER JOIN projects p ON p.workspace_id = ws.id AND p.name = '数据中台建设'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  INNER JOIN projects p ON p.id = t.project_id
  WHERE t.title = '数据 API 网关' AND p.name = '数据中台建设' AND t.parent_id IS NULL
);
