-- TaskManager Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  github_id BIGINT NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT '默认工作区',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member', 'observer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  board_order INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_activity_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_logs_task_id ON task_activity_logs(task_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
