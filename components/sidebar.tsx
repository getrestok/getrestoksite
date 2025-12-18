"use client";

import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { auth, db } from "../lib/firebase";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

type Plan = "basic" | "pro" | "premium" | "enterprise";

export default function Sidebar() {
  const [plan, setPlan] = useState<Plan>("basic");

  // 🔁 Listen for plan changes
  useEffect(() => {
  const unsubAuth = auth.onAuthStateChanged((user) => {
    if (!user) return;

    const unsubUser = onSnapshot(
      doc(db, "users", user.uid),
      (userSnap) => {
        const orgId = userSnap.data()?.orgId;
        if (!orgId) return;

        const unsubOrg = onSnapshot(
          doc(db, "organizations", orgId),
          (orgSnap) => {
            const rawPlan = orgSnap.data()?.plan;

            setPlan(
              rawPlan === "pro" ||
                rawPlan === "premium" ||
                rawPlan === "enterprise"
                ? rawPlan
                : "basic"
            );
          }
        );

        return () => unsubOrg();
      }
    );

    return () => unsubUser();
  });

  return () => unsubAuth();
}, []);

  return (
    <aside
  className="
    hidden md:flex
    fixed
    left-0 top-0
    h-screen
    w-64
    bg-white dark:bg-slate-900
    border-r border-slate-200 dark:border-slate-700
    p-6
    flex-col
  "
>
      {/* Logo */}
      <img src="/logo.svg" alt="Restok Logo" className="w-12 h-12 mb-4" />
      <motion.h1
        className="text-2xl font-bold mb-8 text-slate-800 dark:text-slate-100"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        Restok
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
          href="/dashboard/vendors"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          🏪 Vendors
        </motion.a>

        <motion.a
          href="/dashboard/restock"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          🧾 Restock
        </motion.a>

        <motion.a
          href="/dashboard/settings"
          whileHover={{ x: 4 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          ⚙️ Settings
        </motion.a>
      </nav>

      {/* Bottom section */}
      <div className="mt-auto flex flex-col gap-3 pt-6">

        {/* PLAN STATUS */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              Plan
            </span>

            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold
                ${
                  plan === "basic"
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    : plan === "pro"
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                    : plan === "premium"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                }
              `}
            >
              {plan.toUpperCase()}
            </span>
          </div>

          {plan !== "enterprise" && (
            <button
              onClick={() =>
                (window.location.href = "/dashboard/settings#billing")
              }
              className="mt-2 w-full text-xs bg-sky-600 hover:bg-sky-700 text-white py-1.5 rounded-md"
            >
              {plan === "basic" ? "Upgrade plan" : "Manage plan"}
            </button>
          )}
        </div>

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