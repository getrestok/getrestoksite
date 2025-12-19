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
};

type Vendor = {
  id: string;
  name: string;
  hasPhysicalStore?: boolean;
};

type Plan = "basic" | "pro" | "premium" | "enterprise";

// 🔒 PRO Upsell Blur
function LockedBlur({ children, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden group cursor-pointer no-print"
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
  const [orgId, setOrgId] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [filter, setFilter] = useState<"low" | "due" | "all">("low");
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [plan, setPlan] = useState<Plan>("basic");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showUpsell, setShowUpsell] = useState(false);

  const [planLoaded, setPlanLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loading = !planLoaded || !dataLoaded;

  // -------------------------
  // AUTH + ORG + PLAN
  // -------------------------
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) return router.push("/login");

      setUser(u);

      onSnapshot(doc(db, "users", u.uid), (snap) => {
        const org = snap.data()?.orgId;
        if (!org) return;

        setOrgId(org);

        onSnapshot(doc(db, "organizations", org), (orgSnap) => {
          const p = orgSnap.data()?.plan;
          setPlan(
            p === "pro" || p === "premium" || p === "enterprise"
              ? p
              : "basic"
          );
          setPlanLoaded(true);
        });
      });
    });
  }, [router]);

  // -------------------------
  // ITEMS
  // -------------------------
  useEffect(() => {
    if (!orgId) return;

    return onSnapshot(
      collection(db, "organizations", orgId, "items"),
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as Item[]
        );
        setDataLoaded(true);
      }
    );
  }, [orgId]);

  // -------------------------
  // VENDORS
  // -------------------------
  useEffect(() => {
    if (!orgId) return;

    return onSnapshot(
      collection(db, "organizations", orgId, "vendors"),
      (snap) => {
        const map: Record<string, Vendor> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...(d.data() as any) };
        });
        setVendors(map);
      }
    );
  }, [orgId]);

  // -------------------------
  // FILTERING
  // -------------------------
  useEffect(() => {
    if (!items.length) {
      setFilteredItems([]);
      setSelectedIds(new Set());
      return;
    }

    const now = Date.now();

    function daysLeft(item: Item) {
      if (!item.createdAt?.toDate) return 999;
      const created = item.createdAt.toDate();
      const diff = Math.floor((now - created.getTime()) / 86400000);
      return item.daysLast - diff;
    }

    let result = items;

    if (filter === "low")
      result = items.filter((i) => {
        const d = daysLeft(i);
        return d <= 3 && d > 0;
      });

    if (filter === "due")
      result = items.filter((i) => daysLeft(i) <= 0);

    setFilteredItems(result);
  }, [items, filter]);

  // -------------------------
  // GROUP STORE PICKUP LIST
  // -------------------------
  const storeItems = filteredItems.filter((item) => {
    if (!item.vendorId) return false;
    const v = vendors[item.vendorId];
    return v?.hasPhysicalStore === true;
  });

  const grouped = storeItems.reduce((acc: any, item) => {
    const vendorName =
      (item.vendorId && vendors[item.vendorId]?.name) ||
      "Unknown Vendor";

    if (!acc[vendorName]) acc[vendorName] = [];
    acc[vendorName].push(item);
    return acc;
  }, {});

  // -------------------------
  // SELECT LOGIC
  // -------------------------
  const allVisibleIds = filteredItems.map((i) => i.id);
  const allVisibleSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));

  function toggleAllVisible() {
    const next = new Set(selectedIds);
    if (allVisibleSelected)
      allVisibleIds.forEach((id) => next.delete(id));
    else allVisibleIds.forEach((id) => next.add(id));

    setSelectedIds(next);
  }

  function toggleSingle(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  // -------------------------
  // LOADING
  // -------------------------
  if (loading) {
    return (
      <motion.main
        className="p-10 flex-1 flex items-center justify-center"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-slate-300 border-t-sky-500 animate-spin" />
          <p className="text-sm text-slate-500">
            Preparing your reports…
          </p>
        </div>
      </motion.main>
    );
  }

  // -------------------------
  // UI
  // -------------------------
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

      {/* BASIC PICKUP REPORT */}
      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl pickup-report">
        <div className="no-print">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">🛒 Store Pickup List</h2>
              <p className="text-sm text-slate-500 mt-1">
                Print a clean list grouped by vendor to take to the store.
              </p>
            </div>

            <div className="text-right text-xs text-slate-500">
              <div>
                Selected:{" "}
                <span className="font-semibold">
                  {selectedIds.size} item
                  {selectedIds.size !== 1 && "s"}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleAllVisible}
                className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {allVisibleSelected
                  ? "Unselect all"
                  : "Select all visible"}
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3 mt-4">
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

        {/* PRINT HEADER */}
        <div className="hidden print:block text-center mb-6">
          <img src="/logo.svg" alt="Restok Logo" className="mx-auto w-12 mb-2" />
          <h1 className="text-2xl font-bold">Restok Store Pickup List</h1>
          <p className="text-slate-600 text-sm">
            Generated: {new Date().toLocaleString()}
          </p>
        </div>

        {/* SCREEN LIST */}
        <div className="mt-6 space-y-8 no-print">
          {Object.keys(grouped).length === 0 && (
            <p className="text-slate-500">
              No items match this report.
            </p>
          )}

          {Object.entries(grouped).map(([vendorName, list]: any) => (
            <div
              key={vendorName}
              className="border rounded-xl bg-slate-50 dark:bg-slate-800/60 shadow-sm"
            >
              <div className="flex justify-between items-center px-4 py-3 rounded-t-xl bg-slate-200 dark:bg-slate-700">
                <h3 className="font-semibold text-lg">
                  🏪 {vendorName}
                </h3>

                <span className="text-sm">
                  {list.length} item
                  {list.length !== 1 && "s"}
                </span>
              </div>

              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/70">
                      <th className="py-2 px-2 w-6">✓</th>
                      <th className="py-2 px-2">Item</th>
                    </tr>
                  </thead>

                  <tbody>
                    {list.map((item: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-sky-600"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSingle(item.id)}
                          />
                        </td>
                        <td className="py-2 px-2">{item.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* PRINT LIST */}
        <div className="hidden print:block mt-8">
          {Object.entries(grouped).map(([vendorName, list]: any) => {
            const selected = list.filter((i: any) =>
              selectedIds.has(i.id)
            );

            if (selected.length === 0) return null;

            return (
              <div
                key={vendorName}
                className="mb-8 border rounded-lg p-4"
              >
                <div className="flex justify-between mb-2">
                  <h2 className="font-bold text-lg">
                    🏪 {vendorName}
                  </h2>
                  <span className="text-sm">
                    {selected.length} item
                    {selected.length !== 1 && "s"}
                  </span>
                </div>

                <table className="w-full text-sm border-t">
                  <thead>
                    <tr>
                      <th className="text-left py-2 w-8">☐</th>
                      <th className="text-left py-2">Item</th>
                      <th className="text-left py-2 w-32">
                        Cycle (days)
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {selected.map((i: any) => (
                      <tr key={i.id} className="border-t">
                        <td className="py-2">☐</td>
                        <td className="py-2">{i.name}</td>
                        <td className="py-2">
                          {i.daysLast || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADVANCED ANALYTICS */}
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
        <div className="mt-4 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl no-print">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Detailed analytics will appear here.
          </p>
        </div>
      )}

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          aside,
          nav,
          header,
          .no-print,
          button {
            display: none !important;
          }

          body {
            background: white !important;
          }

          main {
            padding: 0 !important;
          }

          .pickup-report {
            border: none !important;
            box-shadow: none !important;
            max-width: 900px !important;
            margin: 0 auto !important;
          }

          .report-section {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Upsell Modal */}
      {showUpsell && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 no-print">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-xl max-w-lg w-full">
            <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
            <ul className="mt-4 space-y-2">
              <li>✔️ Restock analytics</li>
              <li>✔️ Problem item tracking</li>
              <li>✔️ Vendor scoring</li>
              <li>✔️ Export reports</li>
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
                  window.location.href =
                    "/dashboard/settings#billing";
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