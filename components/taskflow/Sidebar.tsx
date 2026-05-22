"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { IconMembers, IconTasks } from "./icons";
import { useProject } from "./project-context";
import { MEMBER_ROLE_LABELS } from "@/lib/types";
import { MemberRole } from "@/lib/types";
import { avatarColor, avatarInitial } from "@/lib/taskflow-utils";

function UserAvatar({
  name,
  avatarUrl,
  size = 32,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = avatarInitial(name).toUpperCase();
  const bg = avatarColor(name);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size <= 24 ? 11 : 13,
        fontWeight: 600,
        flexShrink: 0,
      }}
      aria-hidden={!name}
    >
      {initial}
    </div>
  );
}

function ProjectIcon({ name }: { name: string }) {
  return (
    <span className="nav-icon" style={{ opacity: 1 }}>
      <span
        style={{
          width: 18,
          height: 18,
          background: avatarColor(name),
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {avatarInitial(name)}
      </span>
    </span>
  );
}

export function Sidebar({
  taskCount,
  open,
  onNavigate,
}: {
  taskCount?: number;
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { projectId, projects, selectProject } = useProject();
  const role = (session?.user?.role ?? "observer") as MemberRole;
  const displayName = session?.user?.username ?? "用户";
  const avatarUrl = session?.user?.avatar_url ?? null;

  function handleNavClick() {
    onNavigate?.();
  }

  function handleProjectClick(id: number) {
    if (id === projectId) return;
    selectProject(id);
    onNavigate?.();
    if (pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-mark">T</span>
          TaskFlow
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">导航</div>
        <ul className="sidebar-nav">
          <li>
            <Link
              href="/"
              className={pathname === "/" ? "active" : ""}
              onClick={handleNavClick}
            >
              <span className="nav-icon">
                <IconTasks />
              </span>
              任务管理
              {taskCount !== undefined && taskCount > 0 && (
                <span className="badge">{taskCount}</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/members"
              className={pathname === "/members" ? "active" : ""}
              onClick={handleNavClick}
            >
              <span className="nav-icon">
                <IconMembers />
              </span>
              成员管理
            </Link>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">项目</div>
        <ul className="sidebar-nav sidebar-nav-projects">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                className={project.id === projectId ? "active" : undefined}
                onClick={() => handleProjectClick(project.id)}
              >
                <ProjectIcon name={project.name} />
                <span style={{ flex: 1, minWidth: 0 }}>{project.name}</span>
                {project.task_count !== undefined && project.task_count > 0 && (
                  <span className="badge">{project.task_count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-bottom">
        <div
          className="sidebar-user"
          style={{ cursor: "pointer" }}
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="点击退出登录"
        >
          <UserAvatar
            name={displayName}
            avatarUrl={avatarUrl}
            className="sidebar-avatar"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{MEMBER_ROLE_LABELS[role]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
