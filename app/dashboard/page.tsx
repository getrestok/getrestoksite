"use client";

import { motion } from "framer-motion";
import { useOrgStore } from "@/lib/orgStore";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardHome() {
  const router = useRouter();

  // ------------------------------
  // ⭐ Pull everything from global store
  // ------------------------------
 

const [user, setUser] = useState<any>(null);

useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    setUser(u);
  });

  return () => unsub();
}, []);

  const items = useOrgStore((s) => s.items);
  const plan = useOrgStore((s) => s.plan);
  const loading = useOrgStore((s) => s.loading);

  const [attentionItems, setAttentionItems] = useState<any[]>([]);
  const [showAttentionModal, setShowAttentionModal] = useState(false);

  // ------------------------------
  // UTILITIES
  // ------------------------------
  function needsAttention(item: any) {
    if (!item.createdAt?.toDate) return false;

    const created = item.createdAt.toDate();
    const diffDays = Math.floor(
      (Date.now() - created.getTime()) / 86400000
    );

    return item.daysLast - diffDays <= 3;
  }

  const stats = useMemo(() => {
    let runningLow = 0;
    let dueToday = 0;

    items.forEach((item: any) => {
      if (!item.createdAt?.toDate) return;

      const created = item.createdAt.toDate();
      const emptyDate = new Date(created);
      emptyDate.setDate(emptyDate.getDate() + item.daysLast);

      const diffDays = Math.ceil(
        (emptyDate.getTime() - Date.now()) / 86400000
      );

      if (diffDays <= 3) runningLow++;
      if (diffDays === 0) dueToday++;
    });

    return {
      totalItems: items.length,
      runningLow,
      dueToday,
    };
  }, [items]);

  const graphData = useMemo(() => {
    return items
      .map((item: any) => {
        if (!item.createdAt?.toDate) return null;

        const created = item.createdAt.toDate();
        const diff = Math.floor(
          (Date.now() - created.getTime()) / 86400000
        );

        return {
          name: item.name,
          daysLeft: Math.max(item.daysLast - diff, 0),
        };
      })
      .filter(Boolean);
  }, [items]);

  // ------------------------------
  // ATTENTION POPUP
  // ------------------------------
  useEffect(() => {
    if (!items.length) return;

    const isProOrHigher =
      plan === "pro" || plan === "premium" || plan === "enterprise";
    if (!isProOrHigher) return;

    if (!user?.uid) return;

    const key = `restok_attention_dismissed_${user.uid}`;
    if (sessionStorage.getItem(key)) return;

    const needs = items.filter(needsAttention);
    if (!needs.length) return;

    setAttentionItems(needs);
    setShowAttentionModal(true);
  }, [items, plan, user]);

  const currentUser = auth.currentUser;

const displayName =
  currentUser?.displayName ||
  currentUser?.email ||
  "there";

  // ------------------------------
  // LOADING
  // ------------------------------
  if (loading) {
    return (
      <motion.main
        className="flex-1 p-10 flex items-center justify-center"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-300 border-t-sky-500 animate-spin" />
          <p className="text-sm text-slate-500">
            Loading your dashboard…
          </p>
        </div>
      </motion.main>
    );
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <motion.main
      className="flex-1 p-10"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Welcome back, {displayName}!
      </p>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6 mt-10">
        <Stat label="Total Items" value={stats.totalItems} tone="default" />
        <Stat label="Running Low" value={stats.runningLow} tone="amber" />
        <Stat label="Due Today" value={stats.dueToday} tone="red" />
      </div>

      {/* GRAPH */}
      <div className="mt-10 bg-white dark:bg-slate-800 p-6 rounded-xl">
  {graphData.length === 0 ? (
    <p className="text-sm text-slate-500">
      Add items to see your restock timeline.
    </p>
  ) : (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={graphData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line dataKey="daysLeft" stroke="#0ea5e9" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  )}
</div>

      {/* ATTENTION MODAL */}
      {showAttentionModal && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg"
          >
            <h2 className="text-lg font-semibold">
              🔔 Take a look at these items
            </h2>

            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {attentionItems.map((i) => (
                <div
                  key={i.id}
                  className="p-2 bg-slate-100 dark:bg-slate-700 rounded"
                >
                  {i.name}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  sessionStorage.setItem(
                    `restok_attention_dismissed_${user?.uid}`,
                    "true"
                  );
                  setShowAttentionModal(false);
                }}
                className="w-1/2 border rounded py-2"
              >
                Later
              </button>

              <button
                onClick={() => {
                  sessionStorage.setItem(
                    `restok_attention_dismissed_${user?.uid}`,
                    "true"
                  );
                  const ids = attentionItems.map((i) => i.id).join(",");
                  router.push(`/dashboard/restock?review=${ids}`);
                }}
                className="w-1/2 bg-sky-600 text-white rounded py-2"
              >
                Review items
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}

// ------------------------------
// STAT CARD
// ------------------------------
function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "red";
}) {
  let colorClass =
    tone === "amber"
      ? "text-amber-500"
      : tone === "red"
      ? "text-red-500"
      : "text-sky-500";

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl">
      <h3 className="text-slate-500 dark:text-slate-400">{label}</h3>
      <p className={`text-4xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}