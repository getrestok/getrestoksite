"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import BetaNotice from "@/components/BetaNotice";
import OrgLoader from "./OrgLoader";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [requireInstall, setRequireInstall] = useState(false);
  const [checkingInstall, setCheckingInstall] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = localStorage.getItem("restok-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);

    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const ua = window.navigator.userAgent || "";
      const isiOS = /iPhone|iPad|iPod/i.test(ua);
      const isStandalone = Boolean((window as any).navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
      const already = localStorage.getItem("restok_add_to_home_done");

      if (isiOS && !isStandalone && !already) {
        setRequireInstall(true);

        const id = setInterval(() => {
          const nowStandalone = Boolean((window as any).navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
          if (nowStandalone) {
            localStorage.setItem("restok_add_to_home_done", "1");
            setRequireInstall(false);
            clearInterval(id);
          }
        }, 1000);

        return () => clearInterval(id);
      }
    } catch (e) {
      // noop
    }
  }, [mounted]);

  const checkInstall = () => {
    try {
      setCheckingInstall(true);
      const nowStandalone = Boolean((window as any).navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
      if (nowStandalone) {
        localStorage.setItem("restok_add_to_home_done", "1");
        setRequireInstall(false);
      } else {
        // keep blocking; user must follow instructions
        // small visual feedback only
      }
    } finally {
      setCheckingInstall(false);
    }
  };

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

    document.title = `${titles[pathname] || "Dashboard"} – Restok`;
  }, [pathname]);

  if (!mounted) return null;

  return (
    <OrgLoader>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* MOBILE DRAWER */}
        <motion.div
          initial={false}
          animate={{ x: open ? 0 : "-100%" }}
          transition={{ type: "tween" }}
          className="fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 md:hidden"
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </motion.div>

        {/* OVERLAY */}
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* CONTENT */}
        <div className="flex-1 flex flex-col">
          {/* MOBILE TOP BAR */}
          <div className="md:hidden flex items-center gap-3 p-4 border-b bg-white dark:bg-slate-900">
            <button
              onClick={() => setOpen(true)}
              className="text-2xl"
              aria-label="Open menu"
            >
              ☰
            </button>
            <span className="font-semibold">Restok</span>
          </div>

          <BetaNotice />
          {requireInstall ? (
            <main className="flex-1 p-6" aria-hidden="true">{children}</main>
          ) : (
            <main className="flex-1 p-6">{children}</main>
          )}
        </div>

        {requireInstall && (
          <div className="fixed inset-0 z-[9999] bg-white/95 dark:bg-slate-900/95 flex items-center justify-center p-6">
            <div className="max-w-xl text-center">
              <h2 className="text-2xl font-semibold mb-4">Add Restok to your Home Screen</h2>
              <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">To continue using Restok on iPhone, open Safari's Share menu and choose "Add to Home Screen". You will need to use the home screen app to use Restok on IOS.</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                
                 
              </div>
            </div>
          </div>
        )}
      </div>
    </OrgLoader>
  );
}