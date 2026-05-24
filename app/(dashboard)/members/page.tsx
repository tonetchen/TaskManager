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
  const [membersLoading, setMembersLoading] = useState(true);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setMembersLoading(true);
    try {
      const data = await api.getMembers();
      setMembers(data.members);
    } finally {
      if (!options?.silent) setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MembersPageView
      members={members}
      loading={membersLoading}
      canManage={canManage}
      onChangeRole={async (userId, memberRole) => {
        await api.changeMemberRole(userId, memberRole);
        await load({ silent: true });
      }}
    />
  );
}
