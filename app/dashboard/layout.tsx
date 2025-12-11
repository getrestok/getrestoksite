"use client";

import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* SIDEBAR stays mounted across all dashboard routes */}
      <aside className="w-64 bg-white border-r p-6 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold mb-8">StockPilot</h1>

        <nav className="flex flex-col gap-2">
          <a
            href="/dashboard"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            📊 Dashboard
          </a>

          <a
            href="/dashboard/items"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            📦 Items
          </a>

          <a
            href="/dashboard/settings"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            ⚙️ Settings
          </a>
        </nav>
      </aside>

      {/* PAGE CONTENT AREA */}
      <motion.main
        key={Math.random()} // forces animation on route change
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex-1 p-10"
      >
        {children}
      </motion.main>

    </div>
  );
}
