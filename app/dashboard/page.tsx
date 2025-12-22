"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
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

type ItemDoc = {
  id: string;
  name: string;
  daysLast: number;
  createdAt?: any;
};

type Plan = "basic" | "pro" | "premium" | "enterprise";



export default function DashboardHome() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [attentionItems, setAttentionItems] = useState<ItemDoc[]>([]);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [plan, setPlan] = useState<Plan>("basic");

  const [stats, setStats] = useState({
    totalItems: 0,
    runningLow: 0,
    dueToday: 0,
  });

  const [orgId, setOrgId] = useState<string | null>(null);

  // loading flags so we can show spinner
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const isLoading = loadingUser || loadingOrg || loadingItems;

  // -------------------------
  // AUTH → USER → ORG → PLAN + ITEMS
  // -------------------------
  useEffect(() => {
    let unsubOrg: (() => void) | null = null;
    let unsubItems: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setLoadingUser(false);
        router.push("/login");
        return;
      }

      setUser(u);
      setLoadingUser(false);

      // Load user profile to get orgId
      const userSnap = await getDoc(doc(db, "users", u.uid));
      if (!userSnap.exists()) {
        setProfile(null);
        setLoadingOrg(false);
        setLoadingItems(false);
        return;
      }

      const userData = userSnap.data();
      setProfile(userData);

      const org = userData.orgId as string | undefined;
      if (!org) {
        setOrgId(null);
        setLoadingOrg(false);
        setLoadingItems(false);
        return;
      }

      setOrgId(org);

      // Listen to org for plan
      unsubOrg?.();
      unsubOrg = onSnapshot(doc(db, "organizations", org), (orgSnap) => {
        const p = orgSnap.data()?.plan as Plan | undefined;
        setPlan(
          p === "pro" || p === "premium" || p === "enterprise"
            ? p
            : "basic"
        );
        setLoadingOrg(false);
      });

      // Listen to ORG ITEMS (✅ FIXED PATH)
      unsubItems?.();
      unsubItems = onSnapshot(
        collection(db, "organizations", org, "items"),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ItemDoc[];

          setItems(data);
          calculateStats(data);
          setLoadingItems(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubOrg?.();
      unsubItems?.();
    };
  }, [router]);

  // -------------------------
  // ATTENTION POPUP
  // -------------------------
  useEffect(() => {
    if (!user) return;
    if (!items.length) return;

    const isProOrHigher =
      plan === "pro" || plan === "premium" || plan === "enterprise";
    if (!isProOrHigher) return;

    const key = `restok_attention_dismissed_${user.uid}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;

    const needsAttentionItems = items.filter(needsAttention);
    if (needsAttentionItems.length === 0) return;

    setAttentionItems(needsAttentionItems);
    setShowAttentionModal(true);
  }, [items, plan, user]);

  // -------------------------
  // HELPERS
  // -------------------------
  function needsAttention(item: ItemDoc) {
    if (!item.createdAt) return false;

    const created = item.createdAt.toDate();
    const diffDays = Math.floor(
      (Date.now() - created.getTime()) / 86400000
    );

    // 3 days or less remaining
    return item.daysLast - diffDays <= 3;
  }

  function calculateStats(data: ItemDoc[]) {
    let runningLow = 0;
    let dueToday = 0;

    data.forEach((item) => {
      if (!item.createdAt) return;

      const created = item.createdAt.toDate();
      const emptyDate = new Date(created);
      emptyDate.setDate(emptyDate.getDate() + item.daysLast);

      const diffDays = Math.ceil(
        (emptyDate.getTime() - Date.now()) / 86400000
      );

      if (diffDays <= 3) runningLow++;
      if (diffDays === 0) dueToday++;
    });

    setStats({
      totalItems: data.length,
      runningLow,
      dueToday,
    });
  }

  const graphData = items
    .map((item) => {
      if (!item.createdAt) return null;
      const created = item.createdAt.toDate();
      const diff = Math.floor(
        (Date.now() - created.getTime()) / 86400000
      );
      return {
        name: item.name,
        daysLeft: Math.max(item.daysLast - diff, 0),
      };
    })
    .filter(Boolean) as { name: string; daysLeft: number }[];

  const displayName =
    profile?.name || user?.displayName || user?.email || "there";

  // -------------------------
  // LOADING UI
  // -------------------------
  if (isLoading) {
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

  // -------------------------
  // MAIN UI
  // -------------------------
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
                  if (typeof window !== "undefined" && user) {
                    sessionStorage.setItem(
                      `restok_attention_dismissed_${user.uid}`,
                      "true"
                    );
                  }
                  setShowAttentionModal(false);
                }}
                className="w-1/2 border rounded py-2"
              >
                Later
              </button>

              <button
                onClick={() => {
                  if (typeof window !== "undefined" && user) {
                    sessionStorage.setItem(
                      `restok_attention_dismissed_${user.uid}`,
                      "true"
                    );
                  }
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

// Small stat card with Tailwind-safe colors
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
    "text-slate-500"; // default text color if needed elsewhere

  if (tone === "amber") colorClass = "text-amber-500";
  if (tone === "red") colorClass = "text-red-500";
  if (tone === "default") colorClass = "text-sky-500";

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl">
      <h3 className="text-slate-500 dark:text-slate-400">{label}</h3>
      <p className={`text-4xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}