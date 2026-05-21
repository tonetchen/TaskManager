"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/lib/types";
import {
  PRIORITY_CLASS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  UiStatus,
  countSubtasksDone,
  formatTaskHash,
  uiStatusOf,
} from "@/lib/taskflow-utils";
import { Assignee } from "./badges";
import { IconPlus, IconSubtask } from "./icons";

const COLUMNS: UiStatus[] = ["todo", "progress", "review", "done"];
const COLUMN_COLORS: Record<UiStatus, string> = {
  todo: "var(--muted-light)",
  progress: "var(--info)",
  review: "var(--warning)",
  done: "var(--success)",
};

type ColumnItems = Record<UiStatus, number[]>;

function buildColumnItems(tasks: Task[]): ColumnItems {
  const columns: ColumnItems = { todo: [], progress: [], review: [], done: [] };
  const grouped = new Map<UiStatus, Task[]>();

  for (const col of COLUMNS) grouped.set(col, []);
  for (const task of tasks) {
    grouped.get(uiStatusOf(task))!.push(task);
  }

  for (const col of COLUMNS) {
    columns[col] = grouped
      .get(col)!
      .sort((a, b) => (a.board_order ?? 0) - (b.board_order ?? 0))
      .map((t) => t.id);
  }

  return columns;
}

function findContainer(id: UniqueIdentifier, items: ColumnItems): UiStatus | null {
  if (COLUMNS.includes(id as UiStatus)) return id as UiStatus;
  const taskId = Number(id);
  if (Number.isNaN(taskId)) return null;
  return COLUMNS.find((col) => items[col].includes(taskId)) ?? null;
}

function KanbanCardContent({ task }: { task: Task }) {
  const { done, total } = countSubtasksDone(task);
  const hasChildren = total > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span className={`priority ${PRIORITY_CLASS[task.priority]}`} style={{ fontSize: 11 }}>
          <span className="priority-dot" style={{ width: 6, height: 6 }} />
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatTaskHash(task.id)}
        </span>
      </div>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-bottom">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Assignee name={task.assignee_username ?? "未分配"} size="sm" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasChildren && (
            <span className="subtask-count">
              <IconSubtask />
              {done}/{total}
            </span>
          )}
          <span className="due-date" style={{ fontSize: 11 }}>
            {task.due_date ? task.due_date.slice(5) : "—"}
          </span>
        </div>
      </div>
    </>
  );
}

function SortableKanbanCard({
  task,
  canDrag,
  onOpenDetail,
}: {
  task: Task;
  canDrag: boolean;
  onOpenDetail: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canDrag,
    data: { task, column: uiStatusOf(task) },
  });

  const style = isDragging
    ? { opacity: 0, pointerEvents: "none" as const }
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card${canDrag ? " draggable" : ""}${isDragging ? " dragging" : ""}`}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      onClick={() => {
        if (!isDragging) onOpenDetail(task);
      }}
    >
      <KanbanCardContent task={task} />
    </div>
  );
}

function KanbanColumn({
  col,
  taskIds,
  taskMap,
  canDrag,
  canCreate,
  onOpenDetail,
  onCreateInColumn,
}: {
  col: UiStatus;
  taskIds: number[];
  taskMap: Map<number, Task>;
  canDrag: boolean;
  canCreate?: boolean;
  onCreateInColumn?: (status: UiStatus) => void;
  onOpenDetail: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  const colTasks = taskIds.map((id) => taskMap.get(id)).filter(Boolean) as Task[];

  return (
    <div className={`kanban-column${isOver && canDrag ? " drop-over" : ""}`} data-column={col}>
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLUMN_COLORS[col],
              display: "inline-block",
            }}
          />
          {STATUS_LABELS[col]}
          <span className="kanban-column-count">{colTasks.length}</span>
        </div>
        {canCreate && (
          <button
            type="button"
            className="btn-icon btn-sm"
            onClick={() => onCreateInColumn?.(col)}
          >
            <IconPlus />
          </button>
        )}
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="kanban-cards">
          {colTasks.map((t) => (
            <SortableKanbanCard
              key={t.id}
              task={t}
              canDrag={canDrag}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanView({
  tasks,
  onOpenDetail,
  onCreateInColumn,
  onMoveTask,
  canCreate,
  canChangeStatus,
}: {
  tasks: Task[];
  onOpenDetail: (task: Task) => void;
  onCreateInColumn?: (status: UiStatus) => void;
  onMoveTask: (taskId: number, targetStatus: UiStatus, targetIndex: number) => void;
  canCreate?: boolean;
  canChangeStatus: boolean;
}) {
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const [columnItems, setColumnItems] = useState<ColumnItems>(() => buildColumnItems(tasks));
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    setColumnItems(buildColumnItems(tasks));
  }, [tasks]);

  const activeTask = activeId != null ? taskMap.get(activeId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !canChangeStatus) return;

    const activeContainer = findContainer(active.id, columnItems);
    const overContainer = findContainer(over.id, columnItems);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumnItems((prev) => {
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.indexOf(Number(active.id));
      const overIndex = overItems.indexOf(Number(over.id));

      if (activeIndex === -1) return prev;

      activeItems.splice(activeIndex, 1);

      let insertIndex = overItems.length;
      if (over.id !== overContainer) {
        insertIndex = overIndex >= 0 ? overIndex : overItems.length;
      }

      overItems.splice(insertIndex, 0, Number(active.id));

      return {
        ...prev,
        [activeContainer]: activeItems,
        [overContainer]: overItems,
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !canChangeStatus) {
      setColumnItems(buildColumnItems(tasks));
      return;
    }

    const taskId = Number(active.id);
    const task = taskMap.get(taskId);
    if (!task) return;

    const activeContainer = findContainer(active.id, columnItems);
    const overContainer = findContainer(over.id, columnItems);
    if (!activeContainer || !overContainer) {
      setColumnItems(buildColumnItems(tasks));
      return;
    }

    let nextItems = columnItems;

    if (activeContainer === overContainer) {
      const items = [...columnItems[activeContainer]];
      const oldIndex = items.indexOf(taskId);
      const newIndex =
        over.id === overContainer ? items.length - 1 : items.indexOf(Number(over.id));

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        nextItems = {
          ...columnItems,
          [activeContainer]: arrayMove(items, oldIndex, newIndex),
        };
        setColumnItems(nextItems);
      }
    }

    const targetIndex = nextItems[overContainer].indexOf(taskId);
    if (targetIndex === -1) {
      setColumnItems(buildColumnItems(tasks));
      return;
    }

    const originalIndex = buildColumnItems(tasks)[overContainer].indexOf(taskId);
    const originalStatus = uiStatusOf(task);
    if (originalStatus === overContainer && originalIndex === targetIndex) {
      return;
    }

    onMoveTask(taskId, overContainer, targetIndex);
  }

  function handleDragCancel() {
    setActiveId(null);
    setColumnItems(buildColumnItems(tasks));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kanban">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            col={col}
            taskIds={columnItems[col]}
            taskMap={taskMap}
            canDrag={canChangeStatus}
            canCreate={canCreate}
            onOpenDetail={onOpenDetail}
            onCreateInColumn={onCreateInColumn}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="kanban-card kanban-card-overlay">
            <KanbanCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
