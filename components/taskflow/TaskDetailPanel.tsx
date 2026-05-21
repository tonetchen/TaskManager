"use client";

import { Task, TaskActivityLog } from "@/lib/types";
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
import { IconClose, IconEdit, IconTrash } from "./icons";

export function TaskDetailPanel({
  task,
  logs,
  open,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onDelete,
  onStatusClick,
}: {
  task: Task | null;
  logs: TaskActivityLog[];
  open: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusClick: (status: UiStatus) => void;
}) {
  if (!task) return null;

  const current = uiStatusOf(task);
  const subs = task.subtasks ?? [];
  const doneCount = subs.filter((s) => s.status === "done").length;
  const flowSteps: UiStatus[] = ["todo", "progress", "review", "done"];

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

          {subs.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">
                子任务{" "}
                <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  ({doneCount}/{subs.length})
                </span>
              </div>
              <div>
                {subs.map((s) => (
                  <div key={s.id} className="detail-subtask-item">
                    <div
                      className={`detail-subtask-check${s.status === "done" ? " checked" : ""}`}
                    >
                      {s.status === "done" && (
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                    <span>{s.title}</span>
                    <span
                      className={`status-badge ${s.status === "todo" ? "status-todo" : s.status === "in_progress" ? "status-progress" : s.status === "in_review" ? "status-review" : "status-done"}`}
                      style={{ marginLeft: "auto", fontSize: 11, padding: "2px 8px" }}
                    >
                      <span className="status-dot" />
                      {STATUS_LABELS[API_TO_UI_STATUS[s.status]]}
                    </span>
                  </div>
                ))}
              </div>
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
