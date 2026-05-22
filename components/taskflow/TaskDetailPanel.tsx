"use client";

import { useEffect, useState } from "react";
import { Task, TaskActivityLog, TaskPriority } from "@/lib/types";
import {
  API_TO_UI_STATUS,
  STATUS_LABELS,
  UiStatus,
  formatDate,
  formatDateTime,
  formatTaskId,
  uiStatusOf,
} from "@/lib/taskflow-utils";
import { Assignee, PriorityBadge, StatusBadge } from "./badges";
import { IconCheck, IconClose, IconEdit, IconPlus, IconTrash } from "./icons";

const MAX_SUBTASKS = 6;

export function TaskDetailPanel({
  task,
  logs,
  open,
  canEdit,
  canDelete,
  canCreateSubtask,
  canToggleSubtask,
  onClose,
  onEdit,
  onDelete,
  onStatusClick,
  onCreateSubtask,
  onToggleSubtaskDone,
}: {
  task: Task | null;
  logs: TaskActivityLog[];
  open: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateSubtask: boolean;
  canToggleSubtask: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusClick: (status: UiStatus) => void;
  onCreateSubtask: (title: string, priority: TaskPriority) => Promise<void>;
  onToggleSubtaskDone: (subtask: Task) => Promise<void>;
}) {
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>("medium");
  const [subtaskLoading, setSubtaskLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setShowSubtaskInput(false);
      setSubtaskTitle("");
      setSubtaskPriority("medium");
    }
  }, [open, task?.id]);

  if (!task) return null;

  const current = uiStatusOf(task);
  const subs = task.subtasks ?? [];
  const doneCount = subs.filter((s) => s.status === "done").length;
  const flowSteps: UiStatus[] = ["todo", "progress", "review", "done"];
  const isRootTask = task.parent_id === null;

  async function handleCreateSubtask() {
    const title = subtaskTitle.trim();
    if (!title || subtaskLoading) return;
    setSubtaskLoading(true);
    try {
      await onCreateSubtask(title, subtaskPriority);
      setSubtaskTitle("");
      setShowSubtaskInput(false);
    } finally {
      setSubtaskLoading(false);
    }
  }

  async function handleToggleSubtask(sub: Task) {
    if (!canToggleSubtask || togglingId !== null) return;
    setTogglingId(sub.id);
    try {
      await onToggleSubtaskDone(sub);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div
        className={`detail-overlay${open ? " open" : ""}`}
        onClick={onClose}
      />
      <div className={`detail-panel${open ? " open" : ""}`}>
        <div className="detail-header">
          <span
            style={{
              fontSize: 12,
              color: "var(--muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTaskId(task.id)}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {canEdit && (
              <button type="button" className="btn-icon" onClick={onEdit} title="编辑">
                <IconEdit />
              </button>
            )}
            {canDelete && (
              <button type="button" className="btn-icon" onClick={onDelete} title="删除">
                <IconTrash />
              </button>
            )}
            <button type="button" className="btn-icon" onClick={onClose} title="关闭">
              <IconClose />
            </button>
          </div>
        </div>
        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-title">{task.title}</div>
            <div className="detail-desc">{task.description || "暂无描述"}</div>
          </div>

          {canEdit && (
            <div className="detail-section">
              <div className="detail-section-title">状态流转</div>
              <div className="status-flow">
                {flowSteps.map((step, i) => (
                  <span key={step} style={{ display: "contents" }}>
                    {i > 0 && <span className="status-flow-arrow">→</span>}
                    <span
                      className={`status-flow-step${current === step ? " current" : ""}`}
                      data-status={step}
                      onClick={() => onStatusClick(step)}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">详细信息</div>
            <div className="detail-meta-grid">
              <span className="detail-meta-label">优先级</span>
              <span className="detail-meta-value">
                <PriorityBadge priority={task.priority} />
              </span>
              <span className="detail-meta-label">负责人</span>
              <span className="detail-meta-value">
                <Assignee name={task.assignee_username ?? "未分配"} />
              </span>
              <span className="detail-meta-label">截止日期</span>
              <span className="detail-meta-value due-date">
                {formatDate(task.due_date)}
              </span>
              <span className="detail-meta-label">创建时间</span>
              <span className="detail-meta-value due-date">
                {formatDate(task.created_at)}
              </span>
            </div>
          </div>

          {isRootTask && (
            <div className="detail-section">
              <div className="detail-section-title">
                子任务{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  ({doneCount}/{subs.length})
                </span>
              </div>
              <div>
                {subs.map((s) => {
                  const isDone = s.status === "done";
                  return (
                    <div key={s.id} className="detail-subtask-item">
                      <div
                        className={`detail-subtask-check${isDone ? " checked" : ""}${canToggleSubtask ? "" : " readonly"}`}
                        role={canToggleSubtask ? "button" : undefined}
                        tabIndex={canToggleSubtask ? 0 : undefined}
                        aria-label={isDone ? "标记为未完成" : "标记为已完成"}
                        onClick={() => void handleToggleSubtask(s)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void handleToggleSubtask(s);
                          }
                        }}
                        style={{
                          opacity: togglingId === s.id ? 0.5 : 1,
                          cursor: canToggleSubtask ? "pointer" : "default",
                        }}
                      >
                        {isDone && <IconCheck />}
                      </div>
                      <span>{s.title}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11 }}>
                        <StatusBadge status={API_TO_UI_STATUS[s.status]} />
                      </span>
                    </div>
                  );
                })}
              </div>

              {canCreateSubtask && subs.length < MAX_SUBTASKS && (
                <div>
                  {!showSubtaskInput ? (
                    <button
                      type="button"
                      className="add-subtask-btn"
                      onClick={() => setShowSubtaskInput(true)}
                    >
                      <IconPlus />
                      添加子任务
                    </button>
                  ) : (
                    <div className="subtask-input-row">
                      <input
                        className="form-input"
                        type="text"
                        placeholder="输入子任务标题，按 Enter 创建"
                        value={subtaskTitle}
                        disabled={subtaskLoading}
                        style={{ flex: 1 }}
                        autoFocus
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleCreateSubtask();
                          if (e.key === "Escape") {
                            setShowSubtaskInput(false);
                            setSubtaskTitle("");
                          }
                        }}
                      />
                      <select
                        className="form-select"
                        value={subtaskPriority}
                        disabled={subtaskLoading}
                        onChange={(e) =>
                          setSubtaskPriority(e.target.value as TaskPriority)
                        }
                      >
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={subtaskLoading || !subtaskTitle.trim()}
                        onClick={() => void handleCreateSubtask()}
                      >
                        创建
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 28, height: 28 }}
                        disabled={subtaskLoading}
                        onClick={() => {
                          setShowSubtaskInput(false);
                          setSubtaskTitle("");
                        }}
                      >
                        <IconClose />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">操作日志</div>
            <div>
              {logs.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--muted)" }}>暂无日志</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="log-item">
                  <div className="log-dot" />
                  <div className="log-content">
                    <div>
                      <strong>{log.username}</strong> {renderLogText(log)}
                    </div>
                    <div className="log-time">{formatDateTime(log.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function renderLogText(log: TaskActivityLog) {
  if (log.action === "status_changed" && log.from_status && log.to_status) {
    return (
      <>
        将状态从{" "}
        <StatusBadge status={API_TO_UI_STATUS[log.from_status]} /> 变更为{" "}
        <StatusBadge status={API_TO_UI_STATUS[log.to_status]} />
      </>
    );
  }
  if (log.action === "created") return "创建了此任务";
  if (log.action === "deleted") return "删除了此任务";
  return log.detail || "更新了任务";
}
