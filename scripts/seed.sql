-- 演示账号（github_id 与 lib/mock-auth.ts 中 externalId 一致）
INSERT INTO users (github_id, username, email)
VALUES
  (900001, 'admin', 'admin@mock.local'),
  (900002, 'member', 'member@mock.local'),
  (900003, 'observer', 'observer@mock.local')
ON CONFLICT (github_id) DO NOTHING;

-- 默认工作区（以 admin 为创建者）
INSERT INTO workspaces (name, created_by)
SELECT '京东零售默认工作区', u.id
FROM users u
WHERE u.github_id = 900001
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.created_by = u.id
  );

-- 工作区成员与角色
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, m.role
FROM workspaces w
INNER JOIN users admin ON admin.github_id = 900001 AND w.created_by = admin.id
INNER JOIN users u ON u.github_id IN (900001, 900002, 900003)
INNER JOIN (
  VALUES
    (900001::bigint, 'admin'),
    (900002::bigint, 'member'),
    (900003::bigint, 'observer')
) AS m(github_id, role) ON u.github_id = m.github_id
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- 三个默认项目
INSERT INTO projects (workspace_id, name)
SELECT w.id, p.name
FROM workspaces w
INNER JOIN users u ON u.github_id = 900001 AND w.created_by = u.id
CROSS JOIN (
  VALUES
    ('京东零售交易链路重构'),
    ('京东 App 购物体验升级'),
    ('京东零售数据中台建设')
) AS p(name)
WHERE NOT EXISTS (
  SELECT 1 FROM projects pr
  WHERE pr.workspace_id = w.id AND pr.name = p.name
);
