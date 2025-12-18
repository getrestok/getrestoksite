"use client";

import Sidebar from "../../components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-0 md:ml-64">
        {children}
      </div>
    </div>
  );
}