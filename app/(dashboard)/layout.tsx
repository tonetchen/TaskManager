"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/taskflow/Sidebar";
import { ProjectProvider, useProject } from "@/components/taskflow/project-context";
import { LoadingSpinner } from "@/components/taskflow/LoadingSpinner";
import { IconMenu } from "@/components/taskflow/icons";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { projectId } = useProject();
  const [taskCount, setTaskCount] = useState<number | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks?view=list&projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.tasks) setTaskCount(d.tasks.length);
      })
      .catch(() => {});
  }, [projectId, pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="app">
      <header className="mobile-header">
        <button
          type="button"
          className="btn-icon"
          aria-label="打开导航菜单"
          onClick={() => setSidebarOpen(true)}
        >
          <IconMenu />
        </button>
        <span className="mobile-header-title">TaskFlow</span>
      </header>

      <div
        className={`sidebar-backdrop${sidebarOpen ? " open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      <Sidebar
        taskCount={taskCount}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />
      <div className="main">{children}</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="app" style={{ alignItems: "center", justifyContent: "center" }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) return null;

  return (
    <ProjectProvider>
      <DashboardShell>{children}</DashboardShell>
    </ProjectProvider>
  );
}
