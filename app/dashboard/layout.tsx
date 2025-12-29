"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "../../components/sidebar";
import BetaNotice from "@/components/BetaNotice";
import OrgLoader from "./OrgLoader";   // ✅ ADD THIS

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // ---------- THEME + MOUNT ----------
  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("restok-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);

    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  // ---------- PAGE TITLE ----------
  useEffect(() => {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/dashboard/items": "Items",
      "/dashboard/vendors": "Vendors",
      "/dashboard/locations": "Locations",
      "/dashboard/restock": "Restock",
      "/dashboard/reports": "Reports",
      "/dashboard/settings": "Settings",
      "/dashboard/users": "Users",
    };

    const title = titles[pathname] || "Dashboard";
    document.title = `${title} – Restok`;
  }, [pathname]);

  if (!mounted) return null;

  return (
    <OrgLoader>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        <Sidebar />
        <BetaNotice />

        <div className="flex-1 ml-0 md:ml-64">
          {children}
        </div>
      </div>
    </OrgLoader>
  );
}