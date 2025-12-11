"use client";

import { motion } from "framer-motion";
import ThemeToggle from "../../components/ThemeToggle";
import { auth } from "../../lib/firebase";

export default function Sidebar() {
  return (
    <aside
      className="
        fixed          /* keeps it in place */
        left-0 top-0
        h-screen       /* full height always */
        w-64
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700
        p-6
        flex flex-col
      "
    >
      {/* Logo */}
      <motion.h1
        className="text-2xl font-bold mb-8 text-slate-800 dark:text-slate-100"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        StockPilot
      </motion.h1>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 text-slate-700 dark:text-slate-200">
        <motion.a
          href="/dashboard"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          📊 Dashboard
        </motion.a>

        <motion.a
          href="/dashboard/items"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          📦 Items
        </motion.a>

        <motion.a
          href="/dashboard/settings"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ⚙️ Settings
        </motion.a>
      </nav>

      {/* Bottom section (logout + theme toggle) */}
      <div className="mt-auto flex flex-col gap-3 pt-6">
        <ThemeToggle />

        <motion.button
          onClick={() => auth.signOut()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
        >
          Log Out
        </motion.button>
      </div>
    </aside>
  );
}
