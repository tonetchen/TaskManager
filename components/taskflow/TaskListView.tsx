"use client";

import { Fragment, MouseEvent } from "react";
import { Task } from "@/lib/types";
import {
  API_TO_UI_STATUS,
  countSubtasksDone,
  formatDate,
  isOverdue,
  uiStatusOf,
} from "@/lib/taskflow-utils";
import { Assignee, PriorityBadge, StatusBadge } from "./badges";
import { IconRowCheck, IconSubtask } from "./icons";

function TaskRow({
  task,
  isChecked,
  isSubtask,
  hasChildren,
  isExpanded,
  done,
  total,
  onToggleSelect,
  onToggleExpand,
  onOpenDetail,
}: {
  task: Task;
  isChecked: boolean;
  isSubtask?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  done?: number;
  total?: number;
  onToggleSelect?: (e: MouseEvent) => void;
  onToggleExpand?: (e: MouseEvent) => void;
  onOpenDetail: () => void;
}) {
  const assignee = task.assignee_username ?? "未分配";
  const status = isSubtask ? API_TO_UI_STATUS[task.status] : uiStatusOf(task);

  return (
    <tr
      className={isSubtask ? "subtask-row" : undefined}
      onClick={onOpenDetail}
      data-id={task.id}
    >
      <td>
        {!isSubtask && onToggleSelect ? (
          <div
            className={`row-check${isChecked ? " checked" : ""}`}
            onClick={onToggleSelect}
          >
            {isChecked && <IconRowCheck />}
          </div>
        ) : null}
      </td>
      <td>
        <div className={`task-title-cell${isSubtask ? " task-title-cell--sub" : ""}`}>
          {!isSubtask && (
            <div
              className={`task-expand${hasChildren ? " has-children" : ""}`}
              onClick={onToggleExpand}
            >
              {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
            </div>
          )}
          <span className="task-title-text">{task.title}</span>
          {!isSubtask && hasChildren && total! > 0 && (
            <span className="task-subtask-indicator">
              <IconSubtask />
              {done}/{total}
            </span>
          )}
        </div>
      </td>
      <td>
        <StatusBadge status={status} />
      </td>
      <td>
        <PriorityBadge priority={task.priority} />
      </td>
      <td>
        <Assignee name={assignee} />
      </td>
      <td>
        <span className={`due-date${isOverdue(task.due_date) ? " overdue" : ""}`}>
          {formatDate(task.due_date)}
        </span>
      </td>
    </tr>
  );
}

export function TaskListView({
  tasks,
  selected,
  expanded,
  onToggleSelect,
  onToggleExpand,
  onOpenDetail,
}: {
  tasks: Task[];
  selected: Set<number>;
  expanded: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
  onOpenDetail: (task: Task) => void;
}) {
  return (
    <div className="task-table-wrap">
      <table className="task-table">
      <thead>
        <tr>
          <th style={{ width: 32 }} />
          <th>任务</th>
          <th style={{ width: 110 }}>状态</th>
          <th style={{ width: 90 }}>优先级</th>
          <th style={{ width: 120 }}>负责人</th>
          <th style={{ width: 100 }}>截止日期</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => {
          const hasChildren = (t.subtasks?.length ?? 0) > 0;
          const isExpanded = expanded.has(t.id);
          const isChecked = selected.has(t.id);
          const { done, total } = countSubtasksDone(t);

          return (
            <Fragment key={t.id}>
              <TaskRow
                task={t}
                isChecked={isChecked}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                done={done}
                total={total}
                onToggleSelect={(e) => {
                  e.stopPropagation();
                  onToggleSelect(t.id);
                }}
                onToggleExpand={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggleExpand(t.id);
                }}
                onOpenDetail={() => onOpenDetail(t)}
              />
              {hasChildren &&
                isExpanded &&
                t.subtasks!.map((c) => (
                  <TaskRow
                    key={c.id}
                    task={c}
                    isChecked={false}
                    isSubtask
                    onOpenDetail={() => onOpenDetail(c)}
                  />
                ))}
            </Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
