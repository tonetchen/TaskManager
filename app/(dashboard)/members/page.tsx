"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api-client";
import { hasPermission } from "@/lib/permissions";
import { MemberRole, WorkspaceMember } from "@/lib/types";
import { MembersPageView } from "@/components/taskflow/MembersView";

export default function MembersPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "observer") as MemberRole;
  const canManage = hasPermission(role, "member:manage");

  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const load = useCallback(async () => {
    const data = await api.getMembers();
    setMembers(data.members);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <MembersPageView
      members={members}
      canManage={canManage}
      onInvite={async (username, memberRole) => {
        await api.inviteMember(username, memberRole);
        await load();
      }}
      onChangeRole={async (userId, memberRole) => {
        await api.changeMemberRole(userId, memberRole);
        await load();
      }}
    />
  );
}
