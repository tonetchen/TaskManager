"use client";

import { UiStatus } from "@/lib/taskflow-utils";

export function BatchBar({
  count,
  visible,
  onBatchStatus,
  onClear,
}: {
  count: number;
  visible: boolean;
  onBatchStatus: (status: UiStatus) => void;
  onClear: () => void;
}) {
  return (
    <div className={`batch-bar${visible ? " visible" : ""}`}>
      <span>
        已选择 <span className="batch-count">{count}</span> 个任务
      </span>
      <button type="button" onClick={() => onBatchStatus("progress")}>
        → 进行中
      </button>
      <button type="button" onClick={() => onBatchStatus("review")}>
        → 审核中
      </button>
      <button type="button" onClick={() => onBatchStatus("done")}>
        → 已完成
      </button>
      <button
        type="button"
        style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
        onClick={onClear}
      >
        取消
      </button>
    </div>
  );
}
