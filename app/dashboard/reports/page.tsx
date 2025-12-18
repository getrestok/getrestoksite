"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Item = {
  id: string;
  name: string;
  daysLast: number;
  createdAt?: any;
  vendorId?: string;
  restockHistory?: any[];
  alertCount?: number;
};

type Vendor = {
  id: string;
  name: string;
};

type Plan = "basic" | "pro" | "premium" | "enterprise";

// --------------------------------------------------
// 🔒 Blur Lock Component
// --------------------------------------------------
function LockedBlur({ children, onClick }: any) {
  return (
    <div onClick={onClick} className="relative overflow-hidden group cursor-pointer pro-locked">
      <div className="blur-sm pointer-events-none select-none group-hover:blur-md transition">
        {children}
      </div>

      <div className="
        absolute inset-0
        bg-white/70 dark:bg-slate-900/70
        flex flex-col items-center justify-center text-center
        backdrop-blur-sm
      ">
        <span className="text-xl font-bold">🔒 Pro Feature</span>

        <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
          Upgrade to unlock advanced reporting & analytics
        </p>

        <button
          className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
        >
          See Plans
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------
export default function ReportsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [filter, setFilter] = useState<"low" | "due" | "all">("low");

  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [plan, setPlan] = useState<Plan>("basic");
  const [showUpsell, setShowUpsell] = useState(false);

  // -----------------------
  // AUTH
  // -----------------------
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push("/login");
      setUser(u);
    });
  }, [router]);

  // -----------------------
  // LOAD PLAN
  // -----------------------
  useEffect(() => {
    if (!user) return;

    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      const orgId = snap.data()?.orgId;
      if (!orgId) return;

      onSnapshot(doc(db, "organizations", orgId), (orgSnap) => {
        const p = orgSnap.data()?.plan;
        setPlan(
          p === "pro" || p === "premium" || p === "enterprise"
            ? p
            : "basic"
        );
      });
    });
  }, [user]);

  // -----------------------
  // LOAD ITEMS
  // -----------------------
  useEffect(() => {
    if (!user) return;

    return onSnapshot(
      collection(db, "users", user.uid, "items"),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Item[];

        setItems(data);
      }
    );
  }, [user]);

  // -----------------------
  // LOAD VENDORS
  // -----------------------
  useEffect(() => {
    if (!user) return;

    return onSnapshot(
      collection(db, "users", user.uid, "vendors"),
      (snap) => {
        const map: Record<string, Vendor> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...(d.data() as any) };
        });
        setVendors(map);
      }
    );
  }, [user]);

  // -----------------------
  // FILTER LOGIC
  // -----------------------
  useEffect(() => {
    if (!items.length) return;

    const now = Date.now();

    function daysLeft(item: Item) {
      if (!item.createdAt) return 999;
      const created = item.createdAt.toDate();
      const diff = Math.floor((now - created.getTime()) / 86400000);
      return item.daysLast - diff;
    }

    let result = items;

    if (filter === "low")
      result = items.filter((i) => daysLeft(i) <= 3 && daysLeft(i) > 0);
    if (filter === "due")
      result = items.filter((i) => daysLeft(i) <= 0);

    setFilteredItems(result);
  }, [items, filter]);

  // -----------------------
  // GROUP BY VENDOR
  // -----------------------
  const grouped = filteredItems.reduce((acc: any, item) => {
    const vendor =
      (item.vendorId && vendors[item.vendorId]?.name) || "Unassigned Vendor";

    if (!acc[vendor]) acc[vendor] = [];
    acc[vendor].push(item);
    return acc;
  }, {});

  // -----------------------
  // ADVANCED REPORTS LOGIC
  // -----------------------
  type ReportRow = {
    id: string;
    name: string;
    avgDaysBetween: number | null;
    expectedDays: number;
    reliabilityScore: number | null;
    runsOutEarly: boolean;
    alertsTriggered: number;
  };

  const restockFrequencyReport: ReportRow[] = [];
  const problemItems: ReportRow[] = [];

  let vendorStats: Record<string, {
    vendor: string;
    items: number;
    avgReliability: number;
  }> = {};

  items.forEach(item => {
    const history: any[] = item.restockHistory || [];
    const expected = item.daysLast || 0;

    if (history.length < 2) return;

    const sorted = history.map(h => h.toDate().getTime()).sort((a,b) => a - b);

    let intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.floor((sorted[i] - sorted[i-1]) / 86400000);
      intervals.push(diff);
    }

    const avg = intervals.reduce((a,b) => a+b, 0) / intervals.length;

    const reliability =
      expected > 0
        ? Math.min(100, Math.max(0, Math.round((avg / expected) * 100)))
        : null;

    const row: ReportRow = {
      id: item.id,
      name: item.name,
      avgDaysBetween: Math.round(avg),
      expectedDays: expected,
      reliabilityScore: reliability,
      runsOutEarly: avg < expected,
      alertsTriggered: item.alertCount || 0,
    };

    restockFrequencyReport.push(row);

    if (row.runsOutEarly || row.alertsTriggered > 3) {
      problemItems.push(row);
    }

    const vendor =
      (item.vendorId && vendors[item.vendorId]?.name) || "Unassigned Vendor";

    if (!vendorStats[vendor]) {
      vendorStats[vendor] = { vendor, items: 0, avgReliability: 0 };
    }

    vendorStats[vendor].items++;
    vendorStats[vendor].avgReliability += reliability || 0;
  });

  Object.keys(vendorStats).forEach(v => {
    vendorStats[v].avgReliability =
      Math.round(vendorStats[v].avgReliability / vendorStats[v].items);
  });

  // -----------------------
  // UI
  // -----------------------
  return (
    <motion.main className="flex-1 p-10" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
      <h1 className="text-3xl font-bold">Reports</h1>
      <p className="text-slate-600 mt-2">Generate lists & insights to make smarter purchasing decisions.</p>

      {/* ---------------- BASIC PICKUP REPORT (Always Available) ---------------- */}
      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl">

        <h2 className="text-xl font-semibold">🛒 Store Pickup List</h2>

        <div className="flex gap-3 mt-4">
          <button onClick={() => setFilter("low")}
            className={`px-3 py-1.5 rounded ${filter === "low" ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
            Running Low
          </button>

          <button onClick={() => setFilter("due")}
            className={`px-3 py-1.5 rounded ${filter === "due" ? "bg-red-500 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
            Due / Out
          </button>

          <button onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded ${filter === "all" ? "bg-sky-600 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
            All Items
          </button>

          <button onClick={() => window.print()} className="ml-auto bg-slate-900 text-white px-4 py-2 rounded">
            🖨️ Print
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([vendor, list]: any) => (
            <div key={vendor} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">🏪 {vendor}</h3>

              {list.map((item: Item) => (
                <div key={item.id} className="flex justify-between py-2 border-b last:border-none">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 accent-sky-600" />
                    {item.name}
                  </div>

                  <span className="text-sm text-slate-500">
                    {item.daysLast} day cycle
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>


      {/* ---------------- ADVANCED PRO REPORTS ---------------- */}
      <h2 className="mt-12 text-2xl font-bold">📈 Advanced Analytics</h2>

      {plan === "basic" ? (
        <LockedBlur onClick={() => setShowUpsell(true)}>
          <div className="mt-4 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl">
            <div className="h-40 rounded-lg border animate-pulse mb-4"></div>
            <div className="h-24 rounded-lg border animate-pulse"></div>
          </div>
        </LockedBlur>
      ) : (
        <div className="mt-4 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl">
          <p>Real analytics would render here 👍</p>
        </div>
      )}

      {/* PRINT BLOCKER FOR PRO */}
      <style jsx global>{`
        @media print {
          .pro-locked {
            display: none !important;
          }
        }
      `}</style>

      {/* ---------------- UPSALE MODAL ---------------- */}
      {showUpsell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl max-w-lg w-full">
            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Unlock smarter inventory intelligence:
            </p>

            <ul className="mt-4 space-y-2">
              <li>✔️ Restock frequency analytics</li>
              <li>✔️ Problem item detection</li>
              <li>✔️ Vendor performance scoring</li>
              <li>✔️ Exportable reports</li>
              <li>✔️ Priority support</li>
            </ul>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowUpsell(false)} className="w-1/2 border rounded-lg py-2">
                Maybe later
              </button>

              <button
                onClick={() => {
                  setShowUpsell(false);
                  window.location.href = "/dashboard/settings#billing";
                }}
                className="w-1/2 bg-amber-500 text-white rounded-lg py-2"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.main>
  );
}