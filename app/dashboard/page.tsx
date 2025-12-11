"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";

export default function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    runningLow: 0,
    dueToday: 0,
  });

  // -----------------------------
  // AUTH CHECK
  // -----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return () => unsub();
  }, []);

  // -----------------------------
  // FETCH USER ITEMS
  // -----------------------------
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

  // -----------------------------
  // STATS CALCULATION
  // -----------------------------
  function calculateStats(items: any[]) {
    const today = new Date();
    let runningLow = 0;
    let dueToday = 0;

    items.forEach((item) => {
      if (!item.createdAt) return;

      const created = item.createdAt.toDate();
      const emptyDate = new Date(created);
      emptyDate.setDate(emptyDate.getDate() + item.daysLast);

      const diffDays = Math.ceil(
        (emptyDate.getTime() - today.getTime()) / 86400000
      );

      if (diffDays <= 3) runningLow++;
      if (diffDays === 0) dueToday++;
    });

    setStats({
      totalItems: items.length,
      runningLow,
      dueToday,
    });
  }

  return (
    <motion.div
      className="min-h-screen flex bg-slate-100"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >

      {/* =============================== */}
      {/* SIDEBAR – SAME AS ITEMS PAGE */}
      {/* =============================== */}
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
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 font-semibold"
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
          onClick={() => auth.signOut()}
          className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Log Out
        </motion.button>
      </aside>

      {/* =============================== */}
      {/* MAIN CONTENT */}
      {/* =============================== */}
      <main className="flex-1 p-10">
        <motion.h1
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Dashboard
        </motion.h1>

        <motion.p
          className="text-slate-600 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Welcome back, {user?.email}! Here's your supply overview:
        </motion.p>

        {/* =============================== */}
        {/* STATS CARDS */}
        {/* =============================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

          <motion.div
            className="p-6 bg-white rounded-xl shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg text-slate-600">Total Items</h2>
            <p className="text-4xl font-bold mt-2">{stats.totalItems}</p>
          </motion.div>

          <motion.div
            className="p-6 bg-white rounded-xl shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg text-slate-600">Running Low (≤ 3 days)</h2>
            <p className="text-4xl font-bold mt-2 text-amber-600">
              {stats.runningLow}
            </p>
          </motion.div>

          <motion.div
            className="p-6 bg-white rounded-xl shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg text-slate-600">Due Today</h2>
            <p className="text-4xl font-bold mt-2 text-red-600">
              {stats.dueToday}
            </p>
          </motion.div>

        </div>

        {/* =============================== */}
        {/* GRAPH PLACEHOLDER */}
        {/* =============================== */}
        <motion.div
          className="mt-10 bg-white p-6 rounded-xl shadow"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-xl font-semibold mb-4">Usage Trend (Coming Soon)</h2>

          <motion.div
            className="h-64 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            Graph will go here
          </motion.div>
        </motion.div>
      </main>
    </motion.div>
  );
}
