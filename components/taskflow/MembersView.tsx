"use client";

import { MemberRole, WorkspaceMember } from "@/lib/types";
import { avatarColor, avatarInitial, formatDate } from "@/lib/taskflow-utils";
import { RoleBadge } from "./badges";
import { LoadingSpinner } from "./LoadingSpinner";

export function MembersPageView({
  members,
  loading = false,
  canManage,
  onChangeRole,
}: {
  members: WorkspaceMember[];
  loading?: boolean;
  canManage: boolean;
  onChangeRole: (userId: number, role: MemberRole) => Promise<void>;
}) {
  return (
    <>
      <div className="topbar topbar--simple">
        <div className="topbar-primary">
          <div className="topbar-title">成员管理</div>
        </div>
      </div>
      <div className="content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
        <div className="members-grid">
          <div className="member-row header">
            <div>成员</div>
            <div>角色</div>
            <div>加入时间</div>
          </div>
          {members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              canManage={canManage}
              onChangeRole={onChangeRole}
            />
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            权限矩阵
          </div>
          <div className="perm-table-scroll">
          <table className="perm-table">
            <thead>
              <tr>
                <th>功能</th>
                <th>管理员</th>
                <th>成员</th>
                <th>观察者</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>查看任务</td>
                <td className="perm-check">✓</td>
                <td className="perm-check">✓</td>
                <td className="perm-check">✓</td>
              </tr>
              <tr>
                <td>创建任务</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>编辑任务</td>
                <td className="perm-check">✓</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>删除任务</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>审批任务</td>
                <td className="perm-check">✓</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>状态流转</td>
                <td className="perm-check">✓</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>分配权限</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
                <td className="perm-cross">—</td>
              </tr>
              <tr>
                <td>管理成员</td>
                <td className="perm-check">✓</td>
                <td className="perm-cross">—</td>
                <td className="perm-cross">—</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  );
}

function MemberRow({
  member,
  canManage,
  onChangeRole,
}: {
  member: WorkspaceMember;
  canManage: boolean;
  onChangeRole: (userId: number, role: MemberRole) => Promise<void>;
}) {
  const name = member.username ?? "用户";
  const bg = avatarColor(name);

  return (
    <div className="member-row">
      <div className="member-info">
        <div className="member-avatar" style={{ background: bg }}>
          {avatarInitial(name)}
        </div>
        <div>
          <div className="member-name">{name}</div>
          <div className="member-email">{member.email ?? "—"}</div>
        </div>
      </div>
      <div>
        {canManage && member.role !== "admin" ? (
          <select
            className="form-select"
            style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
            value={member.role}
            onChange={(e) => onChangeRole(member.user_id, e.target.value as MemberRole)}
          >
            <option value="member">成员</option>
            <option value="observer">观察者</option>
            <option value="admin">管理员</option>
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>
      <div className="due-date">{formatDate(member.created_at)}</div>
    </div>
  );
}
