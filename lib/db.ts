import { sql } from "./sql";
import { toIsoDateString } from "./taskflow-utils";
import {
  CreateTaskInput,
  MemberRole,
  Project,
  Task,
  TaskActivityLog,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
  User,
  Workspace,
  WorkspaceMember,
} from "./types";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

interface UserRow {
  id: number;
  github_id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    github_id: row.github_id,
    username: row.username,
    email: row.email,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await sql`
    SELECT id, github_id, username, email, avatar_url, created_at, updated_at
    FROM users WHERE id = ${id}
  `;
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as UserRow);
}

export async function getUserByGithubId(githubId: number): Promise<User | null> {
  const result = await sql`
    SELECT id, github_id, username, email, avatar_url, created_at, updated_at
    FROM users WHERE github_id = ${githubId}
  `;
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as UserRow);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const result = await sql`
    SELECT id, github_id, username, email, avatar_url, created_at, updated_at
    FROM users WHERE LOWER(username) = LOWER(${username})
  `;
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as UserRow);
}

export async function createUser(input: {
  githubId: number;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  const result = await sql`
    INSERT INTO users (github_id, username, email, avatar_url)
    VALUES (${input.githubId}, ${input.username}, ${input.email ?? null}, ${input.avatarUrl ?? null})
    RETURNING id, github_id, username, email, avatar_url, created_at, updated_at
  `;
  return rowToUser(result.rows[0] as UserRow);
}

export async function updateUser(
  id: number,
  updates: Partial<Pick<UserRow, "username" | "email" | "avatar_url">>
): Promise<User | null> {
  const result = await sql`
    UPDATE users SET
      username = COALESCE(${updates.username ?? null}, username),
      email = COALESCE(${updates.email ?? null}, email),
      avatar_url = COALESCE(${updates.avatar_url ?? null}, avatar_url),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, github_id, username, email, avatar_url, created_at, updated_at
  `;
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0] as UserRow);
}

export async function getDefaultWorkspaceForUser(userId: number): Promise<Workspace | null> {
  const result = await sql`
    SELECT w.id, w.name, w.created_by, w.created_at, w.updated_at
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ${userId}
    ORDER BY w.id ASC
    LIMIT 1
  `;
  if (result.rows.length === 0) return null;
  return result.rows[0] as Workspace;
}

export async function createWorkspace(name: string, createdBy: number): Promise<Workspace> {
  const result = await sql`
    INSERT INTO workspaces (name, created_by) VALUES (${name}, ${createdBy})
    RETURNING id, name, created_by, created_at, updated_at
  `;
  return result.rows[0] as Workspace;
}

export async function addWorkspaceMember(
  workspaceId: number,
  userId: number,
  role: MemberRole
): Promise<WorkspaceMember> {
  const result = await sql`
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (${workspaceId}, ${userId}, ${role})
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
    RETURNING id, workspace_id, user_id, role, created_at, updated_at
  `;
  return result.rows[0] as WorkspaceMember;
}

export async function getMemberRole(
  workspaceId: number,
  userId: number
): Promise<MemberRole | null> {
  const result = await sql`
    SELECT role FROM workspace_members
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
  `;
  if (result.rows.length === 0) return null;
  return (result.rows[0] as { role: MemberRole }).role;
}

export async function listWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
  const result = await sql`
    SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.created_at, wm.updated_at,
           u.username, u.email, u.avatar_url
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY wm.role ASC, u.username ASC
  `;
  return result.rows as WorkspaceMember[];
}

export async function updateMemberRole(
  workspaceId: number,
  userId: number,
  role: MemberRole
): Promise<WorkspaceMember | null> {
  const result = await sql`
    UPDATE workspace_members SET role = ${role}, updated_at = NOW()
    WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
    RETURNING id, workspace_id, user_id, role, created_at, updated_at
  `;
  if (result.rows.length === 0) return null;
  return result.rows[0] as WorkspaceMember;
}

export async function listProjects(workspaceId: number): Promise<Project[]> {
  const result = await sql`
    SELECT
      p.id,
      p.workspace_id,
      p.name,
      (
        SELECT COUNT(*)::int
        FROM tasks t
        WHERE t.project_id = p.id AND t.parent_id IS NULL
      ) AS task_count
    FROM projects p
    WHERE p.workspace_id = ${workspaceId}
    ORDER BY p.id ASC
  `;
  return result.rows.map((row) => ({
    id: row.id as number,
    workspace_id: row.workspace_id as number,
    name: row.name as string,
    task_count: row.task_count as number,
  }));
}

export async function getProjectById(
  workspaceId: number,
  projectId: number
): Promise<Project | null> {
  const result = await sql`
    SELECT id, workspace_id, name
    FROM projects
    WHERE id = ${projectId} AND workspace_id = ${workspaceId}
  `;
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as number,
    workspace_id: row.workspace_id as number,
    name: row.name as string,
  };
}

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as number,
    workspace_id: row.workspace_id as number,
    project_id: (row.project_id as number | null) ?? undefined,
    parent_id: row.parent_id as number | null,
    title: row.title as string,
    description: row.description as string | null,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    board_order: (row.board_order as number | undefined) ?? 0,
    due_date: toIsoDateString(row.due_date as string | Date | null),
    assignee_id: row.assignee_id as number | null,
    created_by: row.created_by as number,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
    assignee_username: (row.assignee_username as string | null) ?? null,
  };
}

export async function getTaskById(taskId: number): Promise<Task | null> {
  const result = await sql`
    SELECT t.*, u.username AS assignee_username
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.id = ${taskId}
  `;
  if (result.rows.length === 0) return null;
  return mapTaskRow(result.rows[0]);
}

export async function getTaskDepth(taskId: number): Promise<number> {
  let depth = 0;
  let currentId: number | null = taskId;
  while (currentId) {
    const result: { rows: { parent_id: number | null }[] } = await sql`
      SELECT parent_id FROM tasks WHERE id = ${currentId}
    `;
    if (result.rows.length === 0) break;
    const parentId = result.rows[0].parent_id;
    if (!parentId) break;
    depth += 1;
    currentId = parentId;
  }
  return depth;
}

export async function listTasks(
  workspaceId: number,
  filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: number;
    parentId?: number | null;
    projectId?: number;
  } = {}
): Promise<Task[]> {
  const conditions = [`t.workspace_id = ${workspaceId}`];

  if (filters.status) {
    conditions.push(`t.status = '${filters.status}'`);
  }
  if (filters.priority) {
    conditions.push(`t.priority = '${filters.priority}'`);
  }
  if (filters.assigneeId !== undefined) {
    conditions.push(`t.assignee_id = ${filters.assigneeId}`);
  }
  if (filters.projectId !== undefined) {
    conditions.push(`t.project_id = ${filters.projectId}`);
  }
  if (filters.parentId === null) {
    conditions.push(`t.parent_id IS NULL`);
  } else if (filters.parentId !== undefined) {
    conditions.push(`t.parent_id = ${filters.parentId}`);
  }

  const query = `
    SELECT t.*, u.username AS assignee_username
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY t.board_order ASC, t.created_at DESC
  `;
  const result = await sql.query(query);
  return result.rows.map((row) => mapTaskRow(row));
}

export async function createTask(
  workspaceId: number,
  createdBy: number,
  input: CreateTaskInput
): Promise<Task> {
  const projectId = input.projectId ?? 1;
  const result = await sql`
    INSERT INTO tasks (
      workspace_id, project_id, parent_id, title, description, priority, status,
      due_date, assignee_id, created_by
    ) VALUES (
      ${workspaceId},
      ${projectId},
      ${input.parentId ?? null},
      ${input.title},
      ${input.description ?? null},
      ${input.priority ?? "medium"},
      ${input.status ?? "todo"},
      ${input.dueDate ?? null},
      ${input.assigneeId ?? null},
      ${createdBy}
    )
    RETURNING id
  `;
  const id = result.rows[0].id as number;
  return (await getTaskById(id))!;
}

export async function updateTask(
  taskId: number,
  input: UpdateTaskInput
): Promise<Task | null> {
  const existing = await getTaskById(taskId);
  if (!existing) return null;

  const result = await sql`
    UPDATE tasks SET
      title = COALESCE(${input.title ?? null}, title),
      description = COALESCE(${input.description ?? null}, description),
      priority = COALESCE(${input.priority ?? null}, priority),
      status = COALESCE(${input.status ?? null}, status),
      due_date = COALESCE(${input.dueDate ?? null}, due_date),
      assignee_id = COALESCE(${input.assigneeId ?? null}, assignee_id),
      updated_at = NOW()
    WHERE id = ${taskId}
    RETURNING id
  `;
  if (result.rows.length === 0) return null;
  return getTaskById(taskId);
}

async function renumberColumnInDb(workspaceId: number, status: TaskStatus) {
  const result = await sql`
    SELECT id FROM tasks
    WHERE workspace_id = ${workspaceId}
      AND parent_id IS NULL
      AND status = ${status}
    ORDER BY board_order ASC, created_at DESC
  `;
  for (let i = 0; i < result.rows.length; i++) {
    await sql`UPDATE tasks SET board_order = ${i} WHERE id = ${result.rows[i].id}`;
  }
}

export async function reorderKanban(
  workspaceId: number,
  taskId: number,
  targetStatus: TaskStatus,
  targetIndex: number
): Promise<Task | null> {
  const existing = await getTaskById(taskId);
  if (!existing || existing.workspace_id !== workspaceId) return null;
  if (existing.parent_id !== null) {
    throw new Error("VALIDATION: only root tasks can be reordered on kanban");
  }

  const oldStatus = existing.status;
  if (targetStatus !== oldStatus) {
    await sql`
      UPDATE tasks SET status = ${targetStatus}, updated_at = NOW()
      WHERE id = ${taskId}
    `;
    await renumberColumnInDb(workspaceId, oldStatus);
  }

  const columnResult = await sql`
    SELECT id FROM tasks
    WHERE workspace_id = ${workspaceId}
      AND parent_id IS NULL
      AND status = ${targetStatus}
      AND id != ${taskId}
    ORDER BY board_order ASC, created_at DESC
  `;
  const ids = columnResult.rows.map((row) => row.id as number);
  const clampedIndex = Math.max(0, Math.min(targetIndex, ids.length));
  ids.splice(clampedIndex, 0, taskId);

  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE tasks SET board_order = ${i}, updated_at = NOW() WHERE id = ${ids[i]}`;
  }

  return getTaskById(taskId);
}

export async function deleteTask(taskId: number): Promise<boolean> {
  const result = await sql`DELETE FROM tasks WHERE id = ${taskId} RETURNING id`;
  return result.rows.length > 0;
}

export async function createActivityLog(input: {
  taskId: number;
  userId: number;
  action: string;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  detail?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO task_activity_logs (task_id, user_id, action, from_status, to_status, detail)
    VALUES (
      ${input.taskId}, ${input.userId}, ${input.action},
      ${input.fromStatus ?? null}, ${input.toStatus ?? null}, ${input.detail ?? null}
    )
  `;
}

export async function listActivityLogs(taskId: number): Promise<TaskActivityLog[]> {
  const result = await sql`
    SELECT l.*, u.username
    FROM task_activity_logs l
    JOIN users u ON u.id = l.user_id
    WHERE l.task_id = ${taskId}
    ORDER BY l.created_at DESC
  `;
  return result.rows.map((row) => ({
    id: row.id as number,
    task_id: row.task_id as number,
    user_id: row.user_id as number,
    action: row.action as string,
    from_status: row.from_status as TaskStatus | null,
    to_status: row.to_status as TaskStatus | null,
    detail: row.detail as string | null,
    created_at: row.created_at as Date,
    username: row.username as string,
  }));
}

export const WORKSPACE_ROLE_MISSING_MESSAGE =
  "用户未配置工作区角色，请执行 scripts/schema.sql 与 scripts/seed.sql";

export async function ensureUserWorkspace(userId: number): Promise<{
  workspace: Workspace;
  role: MemberRole;
}> {
  const existing = await getDefaultWorkspaceForUser(userId);
  if (existing) {
    const role = await getMemberRole(existing.id, userId);
    if (!role) {
      throw new Error(WORKSPACE_ROLE_MISSING_MESSAGE);
    }
    return { workspace: existing, role };
  }

  const workspace = await createWorkspace("默认工作区", userId);
  await addWorkspaceMember(workspace.id, userId, "admin");
  return { workspace, role: "admin" };
}
