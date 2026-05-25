import { describe, expect, it } from "vitest";
import {
  assertTaskTitleAndAssignee,
  validateTaskTitleAndAssignee,
} from "./task-form-validation";

describe("validateTaskTitleAndAssignee", () => {
  it("accepts non-empty title and assignee", () => {
    expect(validateTaskTitleAndAssignee("  任务 A  ", 1)).toBeNull();
  });

  it("rejects empty title", () => {
    expect(validateTaskTitleAndAssignee("  ", 1)).toBe("请填写任务标题");
  });

  it("rejects missing assignee", () => {
    expect(validateTaskTitleAndAssignee("任务", null)).toBe("请选择负责人");
  });

  it("assertTaskTitleAndAssignee throws with VALIDATION prefix", () => {
    expect(() => assertTaskTitleAndAssignee("", 1)).toThrow(
      "VALIDATION: 请填写任务标题"
    );
  });
});
