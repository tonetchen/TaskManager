"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { IconMembers, IconTasks } from "./icons";
import { useProject } from "./project-context";
import { MEMBER_ROLE_LABELS } from "@/lib/types";
import { MemberRole } from "@/lib/types";
import { avatarColor, avatarInitial } from "@/lib/taskflow-utils";

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
          <div className="sidebar-avatar">{avatarInitial(displayName)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{MEMBER_ROLE_LABELS[role]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
