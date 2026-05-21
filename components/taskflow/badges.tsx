import {
  PRIORITY_CLASS,
  PRIORITY_LABELS,
  STATUS_CLASS,
  STATUS_LABELS,
  UiStatus,
  avatarColor,
  avatarInitial,
} from "@/lib/taskflow-utils";
import { TaskPriority } from "@/lib/types";

export function StatusBadge({ status }: { status: UiStatus }) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status]}`}>
      <span className="status-dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`priority ${PRIORITY_CLASS[priority]}`}>
      <span className="priority-dot" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function Assignee({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "sm";
}) {
  const bg = avatarColor(name);
  return (
    <span className="assignee" style={size === "sm" ? { fontSize: 12 } : undefined}>
      <span
        className="assignee-avatar"
        style={{ background: bg, ...(size === "sm" ? { width: 20, height: 20, fontSize: 9 } : {}) }}
      >
        {avatarInitial(name)}
      </span>
      {name}
    </span>
  );
}

export function RoleBadge({ role }: { role: "admin" | "member" | "observer" }) {
  const labels = { admin: "管理员", member: "成员", observer: "观察者" };
  return <span className={`role-badge role-${role}`}>{labels[role]}</span>;
}
