"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardHome() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    runningLow: 0,
    dueToday: 0,
  });

  // 🌙 Dark mode detection (CLIENT ONLY)
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    // this ONLY runs in browser → safe
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));

    // also listen for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });

    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // AUTH CHECK
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push("/login");

      setUser(u);

      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) setProfile(snap.data());
    });

    return () => unsub();
  }, [router]);

  async function sendEmail(to: string, subject: string, message: string) {
  await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, message }),
  });
}


  // FETCH ITEMS
  useEffect(() => {
    if (!user) return;

    const unsubItems = onSnapshot(
      collection(db, "users", user.uid, "items"),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setItems(data);
        calculateStats(data);
      }
    );

    return () => unsubItems();
  }, [user]);

  // CALCULATE STATS
  function calculateStats(items: any[]) {
    const today = new Date();
    let runningLow = 0;
    let dueToday = 0;

    items.forEach((item) => {
      if (!item.createdAt) return;

      const created = item.createdAt.toDate();
      const emptyDate = new Date(created);
      emptyDate.setDate(emptyDate.getDate() + item.daysLast);

      const diffDays = Math.ceil((emptyDate.getTime() - today.getTime()) / 86400000);

      if (diffDays <= 3) runningLow++;
      if (diffDays === 0) dueToday++;
    });

    setStats({ totalItems: items.length, runningLow, dueToday });
  }

  // GRAPH DATA
  const graphData = items
    .map((item) => {
      if (!item.createdAt) return null;

      const created = item.createdAt.toDate();
      const now = new Date();
      const diff = Math.floor((now.getTime() - created.getTime()) / 86400000);
      const daysLeft = Math.max(item.daysLast - diff, 0);

      return { name: item.name, daysLeft };
    })
    .filter(Boolean);

  const displayName =
    profile?.name || user?.displayName || user?.email || "there";

  return (
    <motion.main
      className="flex-1 p-10 text-slate-800 dark:text-slate-100"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <p className="text-slate-600 dark:text-slate-300 mt-2">
        Welcome back, {displayName}! Here's your supply overview:
      </p>

      {/* ========================== */}
      {/*        STATS CARDS        */}
      {/* ========================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg text-slate-600 dark:text-slate-300">Total Items</h2>
          <p className="text-4xl font-bold mt-2">{stats.totalItems}</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg text-slate-600 dark:text-slate-300">
            Running Low (≤ 3 days)
          </h2>
          <p className="text-4xl font-bold mt-2 text-amber-500">
            {stats.runningLow}
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg text-slate-600 dark:text-slate-300">Due Today</h2>
          <p className="text-4xl font-bold mt-2 text-red-500">
            {stats.dueToday}
          </p>
        </div>
      </div>

      {/* ========================== */}
      {/*        GRAPH CARD         */}
      {/* ========================== */}
      <div className="mt-10 bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold mb-4">Days Left Per Item</h2>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={graphData} style={{ background: "transparent" }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "#ffffff22" : "#00000022"}
              />

              <XAxis
                dataKey="name"
                stroke="currentColor"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                stroke="currentColor"
                tick={{ fill: "currentColor" }}
              />

              <Tooltip
                contentStyle={{
                  background: isDark ? "#1e293b" : "#ffffff",
                  border: isDark ? "1px solid #334155" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  color: isDark ? "#f1f5f9" : "#1e293b",
                }}
              />

              <Line
                type="monotone"
                dataKey="daysLeft"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.main>
  );
}
