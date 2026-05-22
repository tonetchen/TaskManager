"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { hasPermission } from "@/lib/permissions";
import { canTransition } from "@/lib/task-status";
import { Task, TaskActivityLog, TaskPriority, TaskStatus, WorkspaceMember } from "@/lib/types";
import { MemberRole } from "@/lib/types";
import { UI_STATUS_MAP, UiStatus, normalizeListTasks, toIsoDateString, uiStatusOf } from "@/lib/taskflow-utils";
import { BatchBar } from "./BatchBar";
import { FilterBar } from "./FilterBar";
import { IconKanban, IconList, IconPlus } from "./icons";
import { KanbanView } from "./KanbanView";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskFormData, TaskModal } from "./TaskModal";
import { TaskListView } from "./TaskListView";
import { useProject } from "./project-context";

export function TasksApp() {
  const { data: session } = useSession();
  const { projectId, project, refreshProjects, adjustProjectTaskCount } = useProject();
  const role = (session?.user?.role ?? "observer") as MemberRole;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<number | "all">("all");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailLogs, setDetailLogs] = useState<TaskActivityLog[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<UiStatus>("todo");

  const canCreate = hasPermission(role, "task:create");
  const canUpdate = hasPermission(role, "task:update");
  const canDelete = hasPermission(role, "task:delete");
  const canChangeStatus = hasPermission(role, "task:change_status");

  const loadTasks = useCallback(async (options?: { silent?: boolean }) => {
    const isKanban = view === "kanban";
    const params = new URLSearchParams({
      view: isKanban ? "board" : "list",
      projectId: String(projectId),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (assigneeFilter !== "all") params.set("assigneeId", String(assigneeFilter));

    if (!options?.silent) setTasksLoading(true);
    try {
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(isKanban ? data.tasks : normalizeListTasks(data.tasks));
      }
    } finally {
      if (!options?.silent) setTasksLoading(false);
    }
  }, [view, statusFilter, priorityFilter, assigneeFilter, projectId]);

  function upsertTaskInState(task: Task) {
    setTasks((prev) => {
      if (view === "kanban") {
        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
          return prev.map((t) => (t.id === task.id ? { ...t, ...task } : t));
        }
        if (task.parent_id) return prev;
        return [...prev, task];
      }

      if (task.parent_id) {
        return prev.map((root) =>
          root.id === task.parent_id
            ? {
                ...root,
                subtasks: root.subtasks?.some((s) => s.id === task.id)
                  ? root.subtasks.map((s) => (s.id === task.id ? { ...s, ...task } : s))
                  : [...(root.subtasks ?? []), task],
              }
            : root
        );
      }

      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        return prev.map((t) => (t.id === task.id ? { ...t, ...task, subtasks: t.subtasks } : t));
      }
      return [{ ...task, subtasks: [] }, ...prev];
    });
  }

  function removeTaskFromState(taskId: number) {
    setTasks((prev) => {
      if (view === "kanban") {
        return prev.filter((t) => t.id !== taskId);
      }
      return prev
        .filter((t) => t.id !== taskId)
        .map((t) => ({
          ...t,
          subtasks: (t.subtasks ?? []).filter((s) => s.id !== taskId),
        }));
    });
  }

  const loadMembers = useCallback(async () => {
    try {
      const data = await api.getMembers();
      setMembers(data.members);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadMembers();
  }, [loadTasks, loadMembers]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects, projectId]);

  useEffect(() => {
    setSelected(new Set());
    setExpanded(new Set());
    setDetailOpen(false);
    setDetailTask(null);
    setDetailLogs([]);
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setTasks([]);
    setTasksLoading(true);
  }, [projectId]);

  useEffect(() => {
    setTasks([]);
    setTasksLoading(true);
  }, [view]);

  async function openDetail(task: Task) {
    setDetailTask(task);
    setDetailOpen(true);
    const data = await api.getTask(task.id);
    setDetailTask(data.task);
    setDetailLogs(data.logs);
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailTask(null);
    setDetailLogs([]);
  }

  function openCreate(status: UiStatus = "todo") {
    setModalMode("create");
    setModalInitial(null);
    setDefaultStatus(status);
    setModalOpen(true);
  }

  function openEdit() {
    if (!detailTask) return;
    setModalMode("edit");
    setModalInitial(detailTask);
    setModalOpen(true);
  }

  async function handleFormSubmit(form: TaskFormData) {
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      status: UI_STATUS_MAP[form.status],
      dueDate: toIsoDateString(form.dueDate) || null,
      assigneeId: form.assigneeId,
      parentId: form.parentId,
    };

    if (modalMode === "create") {
      const { task } = await api.createTask({ ...payload, projectId });
      upsertTaskInState(task);
      if (!task.parent_id) adjustProjectTaskCount(projectId, 1);
    } else if (modalInitial) {
      const { task } = await api.updateTask(modalInitial.id, payload);
      upsertTaskInState(task);
    }

    if (detailTask && modalInitial?.id === detailTask.id) {
      const data = await api.getTask(detailTask.id);
      setDetailTask(data.task);
      setDetailLogs(data.logs);
    }

    void loadTasks({ silent: true });
  }

  async function handleDelete() {
    if (!detailTask || !canDelete) return;
    if (!confirm("确定删除此任务？")) return;
    const deletedId = detailTask.id;
    const isRoot = !detailTask.parent_id;
    await api.deleteTask(deletedId);
    closeDetail();
    removeTaskFromState(deletedId);
    if (isRoot) adjustProjectTaskCount(projectId, -1);
    void loadTasks({ silent: true });
  }

  async function handleStatusClick(status: UiStatus) {
    if (!detailTask || !canChangeStatus) return;
    const { task } = await api.updateTask(detailTask.id, { status: UI_STATUS_MAP[status] });
    setDetailTask(task);
    upsertTaskInState(task);
    const data = await api.getTask(detailTask.id);
    setDetailLogs(data.logs);
  }

  async function handleBatchStatus(status: UiStatus) {
    if (!canChangeStatus || selected.size === 0) return;
    const { tasks: updated } = await api.batchUpdateStatus([...selected], UI_STATUS_MAP[status]);
    setSelected(new Set());
    for (const task of updated) upsertTaskInState(task);
  }

  async function handleKanbanMove(taskId: number, targetStatus: UiStatus, targetIndex: number) {
    if (!canChangeStatus) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = UI_STATUS_MAP[targetStatus];
    const oldStatus = uiStatusOf(task);

    if (oldStatus !== targetStatus && !canTransition(task.status, newStatus)) {
      return;
    }

    const prevTasks = tasks;
    setTasks((prev) => {
      const others = prev.filter((t) => t.id !== taskId);
      const sameColumn = others
        .filter((t) => !t.parent_id && uiStatusOf(t) === targetStatus)
        .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0));
      const reordered = [...sameColumn];
      reordered.splice(Math.min(targetIndex, reordered.length), 0, {
        ...task,
        status: newStatus,
        board_order: targetIndex,
      });
      const orderMap = new Map(reordered.map((t, i) => [t.id, i]));
      return prev.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: newStatus, board_order: orderMap.get(t.id) ?? targetIndex };
        }
        if (!t.parent_id && uiStatusOf(t) === targetStatus) {
          const order = orderMap.get(t.id);
          if (order !== undefined) return { ...t, board_order: order };
        }
        if (!t.parent_id && t.id !== taskId && oldStatus !== targetStatus && uiStatusOf(t) === oldStatus) {
          const col = prev
            .filter((x) => !x.parent_id && uiStatusOf(x) === oldStatus && x.id !== taskId)
            .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0));
          const idx = col.findIndex((x) => x.id === t.id);
          if (idx >= 0) return { ...t, board_order: idx };
        }
        return t;
      });
    });

    try {
      const { task } = await api.reorderKanban(taskId, newStatus, targetIndex);
      upsertTaskInState(task);
      if (detailTask?.id === taskId) {
        setDetailTask(task);
        const data = await api.getTask(taskId);
        setDetailLogs(data.logs);
      }
    } catch {
      setTasks(prevTasks);
    }
  }

  const rootTasks = tasks.filter((t) => !t.parent_id);

  return (
    <>
      <div className="page active" id="page-tasks">
        <div className="topbar">
          <div className="topbar-primary">
            <div className="topbar-title">{project?.name ?? "任务管理"}</div>
            <div className="topbar-actions">
              <div className="view-toggle">
                <button
                  type="button"
                  className={view === "list" ? "active" : ""}
                  id="btn-list"
                  onClick={() => setView("list")}
                >
                  <IconList />
                  列表
                </button>
                <button
                  type="button"
                  className={view === "kanban" ? "active" : ""}
                  id="btn-kanban"
                  onClick={() => setView("kanban")}
                >
                  <IconKanban />
                  看板
                </button>
              </div>
              {canCreate && (
                <button type="button" className="btn btn-primary" onClick={() => openCreate()}>
                  <IconPlus />
                  新建任务
                </button>
              )}
            </div>
          </div>
          <div className="topbar-filters">
            <FilterBar
              status={statusFilter}
              priority={priorityFilter}
              assigneeId={assigneeFilter}
              members={members}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
              onAssigneeChange={setAssigneeFilter}
            />
          </div>
        </div>

        <div className="content">
          <div className={`page${view === "list" ? " active" : ""}`} id="view-list">
            {tasksLoading ? (
              <div className="empty-state">
                <div className="empty-state-text">加载中...</div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">暂无任务</div>
              </div>
            ) : (
              <TaskListView
                tasks={rootTasks}
                selected={selected}
                expanded={expanded}
                onToggleSelect={(id) => {
                  const next = new Set(selected);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setSelected(next);
                }}
                onToggleExpand={(id) => {
                  const next = new Set(expanded);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  setExpanded(next);
                }}
                onOpenDetail={openDetail}
              />
            )}
          </div>
          <div className={`page${view === "kanban" ? " active" : ""}`} id="view-kanban">
            {tasksLoading ? (
              <div className="empty-state">
                <div className="empty-state-text">加载中...</div>
              </div>
            ) : (
              <KanbanView
                tasks={rootTasks}
                onOpenDetail={openDetail}
                onCreateInColumn={(s) => openCreate(s)}
                onMoveTask={handleKanbanMove}
                canCreate={canCreate}
                canChangeStatus={canChangeStatus}
              />
            )}
          </div>
        </div>
      </div>

      <TaskDetailPanel
        task={detailTask}
        logs={detailLogs}
        open={detailOpen}
        canEdit={canUpdate}
        canDelete={canDelete}
        onClose={closeDetail}
        onEdit={openEdit}
        onDelete={handleDelete}
        onStatusClick={handleStatusClick}
      />

      <TaskModal
        open={modalOpen}
        mode={modalMode}
        initial={modalInitial}
        parentTasks={rootTasks}
        members={members}
        onClose={() => setModalOpen(false)}
        defaultStatus={defaultStatus}
        onSubmit={handleFormSubmit}
      />

      {canChangeStatus && (
        <BatchBar
          count={selected.size}
          visible={selected.size > 0}
          onBatchStatus={handleBatchStatus}
          onClear={() => setSelected(new Set())}
        />
      )}
    </>
  );
}
