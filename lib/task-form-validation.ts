/** 新建/编辑任务：标题与负责人必填 */
export function validateTaskTitleAndAssignee(
  title: string | undefined,
  assigneeId: number | null | undefined
): string | null {
  if (!title?.trim()) return "请填写任务标题";
  if (assigneeId == null) return "请选择负责人";
  return null;
}

export function assertTaskTitleAndAssignee(
  title: string | undefined,
  assigneeId: number | null | undefined
): void {
  const message = validateTaskTitleAndAssignee(title, assigneeId);
  if (message) {
    throw new Error(`VALIDATION: ${message}`);
  }
}
