import { describe, expect, it } from "vitest";
import { canTransition, assertTransition } from "./task-status";

describe("task-status state machine", () => {
  it("allows forward flow", () => {
    expect(canTransition("todo", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "in_review")).toBe(true);
    expect(canTransition("in_review", "done")).toBe(true);
  });

  it("allows reject from review", () => {
    expect(canTransition("in_review", "in_progress")).toBe(true);
  });

  it("rejects invalid jumps", () => {
    expect(canTransition("todo", "done")).toBe(false);
    expect(canTransition("done", "todo")).toBe(false);
  });

  it("assertTransition throws on invalid", () => {
    expect(() => assertTransition("todo", "done")).toThrow("INVALID_TRANSITION");
  });

  it("same status is allowed", () => {
    expect(canTransition("todo", "todo")).toBe(true);
  });
});
