"use client";

import Sidebar from "../components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      
      {/* FIXED SIDEBAR */}
      <Sidebar />

      {/* PAGE CONTENT — scrollable */}
      <main className="ml-64 p-10">
        {children}
      </main>

    </div>
  );
}
