import {
  addWorkspaceMember,
  getUserByUsername,
  listWorkspaceMembers,
  updateMemberRole,
} from "@/lib/db";
import { assertPermission } from "@/lib/permissions";
import { MemberRole, WorkspaceMember } from "@/lib/types";

export async function listMembers(
  workspaceId: number,
  role: MemberRole
): Promise<WorkspaceMember[]> {
  assertPermission(role, "task:view");
  return listWorkspaceMembers(workspaceId);
}

export async function inviteMember(
  workspaceId: number,
  actorRole: MemberRole,
  username: string,
  memberRole: MemberRole
): Promise<WorkspaceMember> {
  assertPermission(actorRole, "member:manage");

  const user = await getUserByUsername(username);
  if (!user) {
    throw new Error("NOT_FOUND: user");
  }

  return addWorkspaceMember(workspaceId, user.id, memberRole);
}

export async function changeMemberRole(
  workspaceId: number,
  actorRole: MemberRole,
  userId: number,
  newRole: MemberRole
): Promise<WorkspaceMember> {
  assertPermission(actorRole, "member:manage");

  const updated = await updateMemberRole(workspaceId, userId, newRole);
  if (!updated) {
    throw new Error("NOT_FOUND: member");
  }
  return updated;
}
