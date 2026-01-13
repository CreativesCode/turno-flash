"use client";

import { Sidebar } from "./Sidebar";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
