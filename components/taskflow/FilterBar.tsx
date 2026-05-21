"use client";

import { useEffect, useRef, useState } from "react";
import { TaskPriority, TaskStatus, WorkspaceMember } from "@/lib/types";
import { PRIORITY_LABELS, STATUS_LABELS, UiStatus } from "@/lib/taskflow-utils";

type StatusFilter = TaskStatus | "all";
type PriorityFilter = TaskPriority | "all";
type AssigneeFilter = number | "all";

export function FilterBar({
  status,
  priority,
  assigneeId,
  members,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
}: {
  status: StatusFilter;
  priority: PriorityFilter;
  assigneeId: AssigneeFilter;
  members: WorkspaceMember[];
  onStatusChange: (v: StatusFilter) => void;
  onPriorityChange: (v: PriorityFilter) => void;
  onAssigneeChange: (v: AssigneeFilter) => void;
}) {
  const [openMenu, setOpenMenu] = useState<"status" | "priority" | "assignee" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const statusLabel =
    status === "all"
      ? "全部状态"
      : STATUS_LABELS[
          status === "in_progress" ? "progress" : status === "in_review" ? "review" : (status as UiStatus)
        ];

  return (
    <div ref={rootRef} className="filters">
      <div className="filter-group">
        <FilterChip
          label={statusLabel}
          active={status !== "all" || openMenu === "status"}
          onClick={() => setOpenMenu(openMenu === "status" ? null : "status")}
        />
        {openMenu === "status" && (
          <Dropdown
            options={[
              { value: "all", label: "全部状态" },
              { value: "todo", label: "待开始" },
              { value: "in_progress", label: "进行中" },
              { value: "in_review", label: "审核中" },
              { value: "done", label: "已完成" },
            ]}
            onSelect={(v) => {
              onStatusChange(v as StatusFilter);
              setOpenMenu(null);
            }}
          />
        )}
      </div>

      <div className="filter-group">
        <FilterChip
          label={priority === "all" ? "优先级" : PRIORITY_LABELS[priority]}
          active={priority !== "all" || openMenu === "priority"}
          onClick={() => setOpenMenu(openMenu === "priority" ? null : "priority")}
        />
        {openMenu === "priority" && (
          <Dropdown
            options={[
              { value: "all", label: "全部优先级" },
              { value: "high", label: "高" },
              { value: "medium", label: "中" },
              { value: "low", label: "低" },
            ]}
            onSelect={(v) => {
              onPriorityChange(v as PriorityFilter);
              setOpenMenu(null);
            }}
          />
        )}
      </div>

      <div className="filter-group">
        <FilterChip
          label={
            assigneeId === "all"
              ? "负责人"
              : members.find((m) => m.user_id === assigneeId)?.username ?? "负责人"
          }
          active={assigneeId !== "all" || openMenu === "assignee"}
          onClick={() => setOpenMenu(openMenu === "assignee" ? null : "assignee")}
        />
        {openMenu === "assignee" && (
          <Dropdown
            options={[
              { value: "all", label: "全部负责人" },
              ...members.map((m) => ({
                value: String(m.user_id),
                label: m.username ?? `用户 ${m.user_id}`,
              })),
            ]}
            onSelect={(v) => {
              onAssigneeChange(v === "all" ? "all" : parseInt(v, 10));
              setOpenMenu(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`filter-chip${active ? " active" : ""}`} onClick={onClick}>
      {label} <span className="arrow">▾</span>
    </button>
  );
}

function Dropdown({
  options,
  onSelect,
}: {
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="filter-dropdown">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="filter-dropdown-item"
          onClick={() => onSelect(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
