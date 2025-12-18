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
// 🔒 Blur Lock Component (for advanced section only)
// --------------------------------------------------
function LockedBlur({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden group cursor-pointer pro-locked advanced-section no-print"
    >
      <div className="blur-sm pointer-events-none select-none group-hover:blur-md transition">
        {children}
      </div>

      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center text-center backdrop-blur-sm">
        <span className="text-xl font-bold">🔒 Pro Feature</span>
        <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
          Upgrade to unlock advanced reporting & analytics
        </p>
        <button className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg">
          See Plans
        </button>
      </div>
    </div>
  );
}

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
    if (!items.length) {
      setFilteredItems([]);
      return;
    }

    const now = Date.now();

    function daysLeft(item: Item) {
      if (!item.createdAt) return 999;
      const created = item.createdAt.toDate();
      const diff = Math.floor((now - created.getTime()) / 86400000);
      return item.daysLast - diff;
    }

    let result = items;

    if (filter === "low") {
      result = items.filter((i) => {
        const d = daysLeft(i);
        return d <= 3 && d > 0;
      });
    }

    if (filter === "due") {
      result = items.filter((i) => daysLeft(i) <= 0);
    }

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
  // ADVANCED REPORTS LOGIC (for Pro+)
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

  let vendorStats: Record<
    string,
    {
      vendor: string;
      items: number;
      avgReliability: number;
    }
  > = {};

  items.forEach((item) => {
    const history: any[] = item.restockHistory || [];
    const expected = item.daysLast || 0;

    if (history.length < 2) return;

    const sorted = history
      .map((h) => h.toDate().getTime())
      .sort((a, b) => a - b);

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.floor((sorted[i] - sorted[i - 1]) / 86400000);
      intervals.push(diff);
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

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

  Object.keys(vendorStats).forEach((v) => {
    vendorStats[v].avgReliability =
      Math.round(vendorStats[v].avgReliability / vendorStats[v].items);
  });

  // -----------------------
  // UI
  // -----------------------
  return (
    <motion.main
      className="flex-1 p-10"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold">Reports</h1>
      <p className="text-slate-600 mt-2">
        Generate lists for store pickup, review, or documentation.
      </p>

      {/* BASIC PICKUP REPORT (prints nicely) */}
      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl pickup-report">
        {/* Screen-only header */}
        <div className="no-print">
          <h2 className="text-xl font-semibold">🛒 Store Pickup List</h2>
          <p className="text-sm text-slate-500 mt-1">
            Print a clean list grouped by vendor to take to the store.
          </p>

          {/* FILTERS */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFilter("low")}
              className={`px-3 py-1.5 rounded ${
                filter === "low"
                  ? "bg-amber-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              Running Low (≤3 days)
            </button>

            <button
              onClick={() => setFilter("due")}
              className={`px-3 py-1.5 rounded ${
                filter === "due"
                  ? "bg-red-500 text-white"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              Due / Out
            </button>

            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded ${
                filter === "all"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              All Items
            </button>

            <button
              onClick={() => window.print()}
              className="ml-auto bg-slate-900 text-white px-4 py-2 rounded hover:opacity-90"
            >
              🖨️ Print List
            </button>
          </div>
        </div>
        </div>

        {/* PRINT HEADER */}
        <div className="hidden print:block text-center mb-6">
          <img
            src="/logo.svg"
            alt="Restok Logo"
            className="mx-auto w-12 mb-2"
          />
          <h1 className="text-2xl font-bold">Restok Store Pickup List</h1>
          <p className="text-slate-600 text-sm">
            Generated: {new Date().toLocaleString()}
          </p>
        </div>

        {/* LIST */}
<div className="mt-6 space-y-8">
  {Object.keys(grouped).length === 0 && (
    <p className="text-slate-500">No items match this report.</p>
  )}

  {Object.entries(grouped).map(([vendor, list]: any) => (
    <div
      key={vendor}
      className="
        report-section 
        border rounded-xl 
        bg-slate-50 dark:bg-slate-800/60 
        shadow-sm
      "
    >
      {/* Vendor Header */}
      <div className="
        flex justify-between items-center 
        px-4 py-3 
        rounded-t-xl 
        bg-slate-200 dark:bg-slate-700
      ">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
          🏪 {vendor}
        </h3>

        <span className="text-sm text-slate-600 dark:text-slate-300">
          {list.length} item{list.length !== 1 && "s"}
        </span>
      </div>

      {/* Table */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700/70">
              <th className="text-left py-2 px-1 w-6">✓</th>
              <th className="text-left py-2 px-2">Item</th>
              <th className="text-left py-2 px-2 w-32">Cycle (days)</th>
            </tr>
          </thead>

          <tbody>
            {list.map((item: Item, i: number) => (
              <tr
                key={item.id}
                className={`
                  border-t 
                  border-slate-300 dark:border-slate-600
                  ${i % 2 === 0 ? "bg-white dark:bg-slate-900/40" : ""}
                `}
              >
                <td className="py-2 px-1 align-top">
                  <input type="checkbox" className="w-4 h-4 accent-sky-600" />
                </td>

                <td className="py-2 px-2 text-slate-800 dark:text-slate-200">
                  {item.name}
                </td>

                <td className="py-2 px-2 text-slate-700 dark:text-slate-300">
                  {item.daysLast ? item.daysLast : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ))}
</div>

      {/* ADVANCED ANALYTICS (blurred on Basic) */}
      <h2 className="mt-12 text-2xl font-bold no-print">
        📈 Advanced Analytics
      </h2>

      {plan === "basic" ? (
        <LockedBlur onClick={() => setShowUpsell(true)}>
          <div className="mt-4 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl">
            <div className="h-40 rounded-lg border animate-pulse mb-4" />
            <div className="h-24 rounded-lg border animate-pulse" />
          </div>
        </LockedBlur>
      ) : (
        <div className="mt-4 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl advanced-section no-print">
          {/* You can later replace this placeholder with real charts/tables */}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Detailed restock frequency, problem items, and vendor performance
            will appear here.
          </p>
        </div>
      )}

      {/* PRINT-ONLY & GLOBAL STYLES */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          /* Hide app chrome, buttons, and upsell stuff */
          aside,
          nav,
          header,
          .no-print,
          .advanced-section,
          .pro-locked,
          button {
            display: none !important;
          }

          main {
            padding: 0 !important;
          }

          /* Make pickup report full width and clean */
          .pickup-report {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            padding: 0 !important;
          }

          .report-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          table {
            border-collapse: collapse;
          }

          th,
          td {
            padding: 6px 4px;
          }
        }
      `}</style>

      {/* Upsell Modal */}
      {showUpsell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 no-print">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl max-w-lg w-full">
            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Unlock smarter inventory intelligence:
            </p>

            <ul className="mt-4 space-y-2 text-slate-700 dark:text-slate-200">
              <li>✔️ Restock frequency analytics</li>
              <li>✔️ Problem item detection</li>
              <li>✔️ Vendor performance scoring</li>
              <li>✔️ Exportable reports</li>
              <li>✔️ Priority support</li>
            </ul>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowUpsell(false)}
                className="w-1/2 border rounded-lg py-2"
              >
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