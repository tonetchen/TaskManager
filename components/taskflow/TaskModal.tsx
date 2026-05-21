"use client";

import { useEffect, useState } from "react";
import { Task, TaskPriority, WorkspaceMember } from "@/lib/types";
import {
  STATUS_LABELS,
  UI_STATUS_MAP,
  UiStatus,
  formatTaskId,
} from "@/lib/taskflow-utils";
import { IconClose } from "./icons";

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: UiStatus;
  assigneeId: number | null;
  dueDate: string;
  parentId: number | null;
}

const defaultForm: TaskFormData = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  assigneeId: null,
  dueDate: "",
  parentId: null,
};

export function TaskModal({
  open,
  mode,
  initial,
  parentTasks,
  members,
  onClose,
  onSubmit,
  defaultStatus = "todo",
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Task | null;
  parentTasks: Task[];
  members: WorkspaceMember[];
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  defaultStatus?: UiStatus;
}) {
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setForm({
        title: initial.title,
        description: initial.description ?? "",
        priority: initial.priority,
        status:
          initial.status === "in_progress"
            ? "progress"
            : initial.status === "in_review"
              ? "review"
              : initial.status,
        assigneeId: initial.assignee_id,
        dueDate: initial.due_date ?? "",
        parentId: initial.parent_id,
      });
    } else {
      setForm({ ...defaultForm, status: defaultStatus });
    }
  }, [open, mode, initial, defaultStatus]);

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={onClose}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{mode === "create" ? "新建任务" : "编辑任务"}</div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">任务标题 *</label>
            <input
              className="form-input"
              type="text"
              placeholder="输入任务标题"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">任务描述</label>
            <textarea
              className="form-textarea"
              placeholder="描述任务的具体内容和验收标准…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">优先级</label>
              <select
                className="form-select"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as TaskPriority })
                }
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">状态</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as UiStatus })
                }
              >
                {(Object.keys(STATUS_LABELS) as UiStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">负责人</label>
              <select
                className="form-select"
                value={form.assigneeId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    assigneeId: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              >
                <option value="">未分配</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">截止日期</label>
              <input
                className="form-input"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>
          {mode === "create" && (
            <div className="form-group">
              <label className="form-label">父任务（可选）</label>
              <select
                className="form-select"
                value={form.parentId ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    parentId: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              >
                <option value="">无（顶层任务）</option>
                {parentTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatTaskId(t.id)} · {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !form.title.trim()}
            onClick={handleSubmit}
          >
            {mode === "create" ? "创建任务" : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { UI_STATUS_MAP };
