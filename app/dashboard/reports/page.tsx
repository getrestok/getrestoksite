"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
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
};

export default function ReportsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [filter, setFilter] = useState<"low" | "due" | "all">("low");

  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

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

      {/* CARD */}
      <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl border max-w-4xl">

        <h2 className="text-xl font-semibold">🛒 Store Pickup List</h2>
        <p className="text-sm text-slate-500 mt-1">
          Print or download a list of items you need to buy in-store.
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
            🖨️ Print
          </button>
        </div>

        {/* LIST */}
        <div className="mt-6 space-y-6 print:mt-4">
          {Object.keys(grouped).length === 0 && (
            <p className="text-slate-500">
              No items match this report.
            </p>
          )}

          {Object.entries(grouped).map(([vendor, list]: any) => (
            <div key={vendor}>
              <h3 className="font-semibold text-lg">{vendor}</h3>

              <div className="mt-2 border rounded-lg divide-y">
                {list.map((item: Item) => (
                  <div
                    key={item.id}
                    className="p-3 flex gap-2 items-center"
                  >
                    <input type="checkbox" />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* PRINT STYLE */}
        <style jsx global>{`
          @media print {
            aside, nav, header, button:not(.allow-print) {
              display: none !important;
            }

            body {
              background: white !important;
            }

            main {
              padding: 0 !important;
            }
          }
        `}</style>
      </div>
    </motion.main>
  );
}