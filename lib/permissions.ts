import { MemberRole } from "./types";

export type Permission =
  | "task:view"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "task:change_status"
  | "member:manage";

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  admin: [
    "task:view",
    "task:create",
    "task:update",
    "task:delete",
    "task:change_status",
    "member:manage",
  ],
  member: [
    "task:view",
    "task:update",
    "task:change_status",
  ],
  observer: ["task:view"],
};

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: MemberRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`FORBIDDEN: ${role} cannot ${permission}`);
  }
}

export function getPermissions(role: MemberRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
