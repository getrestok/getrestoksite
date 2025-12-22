"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Grab stored theme
    const saved = localStorage.getItem("restok-theme");

    // If nothing stored → follow system theme
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);

    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  // Avoid hydration mismatch flash
  if (!mounted) return null;

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