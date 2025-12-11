"use client";

import { motion } from "framer-motion";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="min-h-screen flex bg-slate-100"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* SIDEBAR — now global for all dashboard pages */}
      <aside className="w-64 bg-white border-r p-6 hidden md:flex flex-col">
        <motion.h1
          className="text-2xl font-bold mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          StockPilot
        </motion.h1>

        <nav className="flex flex-col gap-2">
          <motion.a
            href="/dashboard"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
            whileHover={{ x: 4 }}
          >
            📊 Dashboard
          </motion.a>

          <motion.a
            href="/dashboard/items"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
            whileHover={{ x: 4 }}
          >
            📦 Items
          </motion.a>

          <motion.a
            href="/dashboard/settings"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
            whileHover={{ x: 4 }}
          >
            ⚙️ Settings
          </motion.a>
        </nav>

        <motion.button
          onClick={() => signOut(auth)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
        >
          Log Out
        </motion.button>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 p-10">
        {children}
      </main>
    </motion.div>
  );
}
