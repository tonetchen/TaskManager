import { describe, expect, it } from "vitest";
import { hasPermission, getPermissions } from "./permissions";
import { MemberRole } from "./types";

describe("RBAC permissions", () => {
  const cases: Array<[MemberRole, string, boolean]> = [
    ["admin", "task:delete", true],
    ["member", "task:delete", false],
    ["member", "task:create", false],
    ["member", "task:update", true],
    ["observer", "task:view", true],
    ["observer", "task:create", false],
    ["observer", "task:update", false],
    ["member", "task:change_status", true],
    ["member", "member:manage", false],
    ["admin", "member:manage", true],
  ];

  it.each(cases)("role %s permission %s => %s", (role, perm, expected) => {
    expect(hasPermission(role, perm as Parameters<typeof hasPermission>[1])).toBe(
      expected
    );
  });

  it("admin has all task permissions", () => {
    const perms = getPermissions("admin");
    expect(perms).toContain("task:create");
    expect(perms).toContain("task:delete");
    expect(perms).toContain("member:manage");
  });

  it("member can edit and change status but not create or delete", () => {
    const perms = getPermissions("member");
    expect(perms).toContain("task:update");
    expect(perms).toContain("task:change_status");
    expect(perms).not.toContain("task:create");
    expect(perms).not.toContain("task:delete");
    expect(perms).not.toContain("member:manage");
  });
});
