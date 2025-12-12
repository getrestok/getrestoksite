"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { sendAlertEmail } from "@/lib/email";
import { PLANS } from "@/lib/plans";

type ItemDoc = {
  id: string;
  name: string;
  vendor?: string;
  daysLast: number;
  createdAt?: any;
};

export default function ItemsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [alertedStatus, setAlertedStatus] = useState<Record<string, "low" | "out">>({});

  // ADD
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [daysLast, setDaysLast] = useState("");
  const [vendor, setVendor] = useState("");

  // EDIT
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState<ItemDoc | null>(null);

  // ============================
  // STATUS BADGE
  // ============================
  function getStatus(item: ItemDoc) {
    if (!item.createdAt) return null;

    const created = item.createdAt.toDate();
    const diffDays = Math.floor((Date.now() - created.getTime()) / 86400000);
    const daysLeft = item.daysLast - diffDays;

    if (daysLeft <= 0)
      return {
        label: "Due Today",
        color: "bg-red-200 text-red-800",
        daysLeft: 0,
      };

    if (daysLeft <= 3)
      return {
        label: "Running Low",
        color: "bg-amber-200 text-amber-800",
        daysLeft,
      };

    return {
      label: "OK",
      color: "bg-green-200 text-green-800",
      daysLeft,
    };
  }

  // ============================
  // AUTH + DATA
  // ============================
  useEffect(() => {
    let unsubItems: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      const rawPlan = userSnap.data()?.plan;
      setPlan(rawPlan && rawPlan in PLANS ? rawPlan : "basic");

      unsubItems = onSnapshot(
        collection(db, "users", currentUser.uid, "items"),
        (snap) => {
          const itemsData = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ItemDoc[];

          setItems(itemsData);

          // EMAIL ALERTS
          itemsData.forEach((item) => {
            if (!item.createdAt || !currentUser.email) return;

            const created = item.createdAt.toDate();
            const diffDays = Math.floor((Date.now() - created.getTime()) / 86400000);
            const daysLeft = Math.max(item.daysLast - diffDays, 0);

            let status: "ok" | "low" | "out" = "ok";
            if (daysLeft <= 0) status = "out";
            else if (daysLeft <= 3) status = "low";

            if (status === "ok") return;
            if (alertedStatus[item.id] === status) return;

            sendAlertEmail({
              toEmail: currentUser.email,
              toName: currentUser.displayName || "there",
              subject:
                status === "out"
                  ? `🚨 ${item.name} is OUT`
                  : `⚠️ ${item.name} is running low`,
              message:
                status === "out"
                  ? `${item.name} has run out and needs restocking.`
                  : `${item.name} will run out soon.`,
            });

            setAlertedStatus((prev) => ({ ...prev, [item.id]: status }));
          });
        }
      );
    });

    return () => {
      unsubAuth();
      unsubItems?.();
    };
  }, [router, alertedStatus]);

  // ============================
  // PLAN LIMIT
  // ============================
  const planConfig = PLANS[plan];
  const itemLimit =
    "limits" in planConfig ? planConfig.limits.items : Infinity;

  const atItemLimit =
    itemLimit !== Infinity && items.length >= itemLimit;

  // ============================
  // CRUD
  // ============================
  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!user || atItemLimit) return;

    await addDoc(collection(db, "users", user.uid, "items"), {
      name,
      vendor,
      daysLast: Number(daysLast),
      createdAt: serverTimestamp(),
    });

    setName("");
    setDaysLast("");
    setVendor("");
    setShowAdd(false);
  }

  async function handleRefillItem(id: string) {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid, "items", id), {
      createdAt: serverTimestamp(),
    });

    setAlertedStatus((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  async function handleDeleteItem(id: string) {
    if (!user) return;

    await deleteDoc(doc(db, "users", user.uid, "items", id));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editItem) return;

    await updateDoc(doc(db, "users", user.uid, "items", editItem.id), {
      name: editItem.name,
      vendor: editItem.vendor,
      daysLast: Number(editItem.daysLast),
    });

    setShowEdit(false);
    setEditItem(null);
  }

  // ============================
  // UI
  // ============================
  return (
    <motion.div className="p-10 flex-1">
      <h1 className="text-3xl font-bold">Items</h1>

      {/* PLAN BANNER */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <strong>{items.length}</strong> /{" "}
          {itemLimit === Infinity ? "∞" : itemLimit} items used
        </p>

        <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700">
          {PLANS[plan].name} Plan
        </span>
      </div>

      {atItemLimit && (
        <div className="mt-4 p-4 rounded-lg bg-amber-100 text-amber-800 text-sm">
          You’ve reached the <strong>{PLANS[plan].name}</strong> plan limit.
          <a href="/pricing" className="ml-2 underline font-medium">
            Upgrade to add more items
          </a>
        </div>
      )}

      {/* HEADER */}
      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Items</h2>

        {atItemLimit ? (
          <button
            className="px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed"
            title="Upgrade to add more items"
          >
            + Add Item
          </button>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white"
          >
            + Add Item
          </button>
        )}
      </div>

      {/* ITEMS */}
      <div className="mt-6 space-y-3">
        {items.map((item) => {
          const status = getStatus(item);

          return (
            <div
              key={item.id}
              className="p-4 border rounded-lg flex justify-between items-center bg-white"
            >
              <div>
                <h3 className="font-semibold">{item.name}</h3>

                {status && (
                  <span
                    className={`mt-1 inline-block px-2 py-1 text-xs rounded ${status.color}`}
                  >
                    {status.label} • {status.daysLeft} days left
                  </span>
                )}

                <p className="text-sm text-gray-500 mt-2">
                  Vendor: {item.vendor || "—"}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRefillItem(item.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Refill
                </button>
                <button
                  onClick={() => {
                    setEditItem(item);
                    setShowEdit(true);
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={handleAddItem}
            className="bg-white p-6 rounded-xl space-y-4 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold">Add Item</h2>

            <input
              className="w-full border p-3 rounded"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              className="w-full border p-3 rounded"
              type="number"
              placeholder="Days it lasts"
              value={daysLast}
              onChange={(e) => setDaysLast(e.target.value)}
              required
            />

            <input
              className="w-full border p-3 rounded"
              placeholder="Vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-1/2 border p-3 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 bg-sky-600 text-white p-3 rounded"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white p-6 rounded-xl space-y-4 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold">Edit Item</h2>

            <input
              className="w-full border p-3 rounded"
              value={editItem.name}
              onChange={(e) =>
                setEditItem({ ...editItem, name: e.target.value })
              }
            />

            <input
              className="w-full border p-3 rounded"
              type="number"
              value={editItem.daysLast}
              onChange={(e) =>
                setEditItem({
                  ...editItem,
                  daysLast: Number(e.target.value),
                })
              }
            />

            <input
              className="w-full border p-3 rounded"
              value={editItem.vendor || ""}
              onChange={(e) =>
                setEditItem({ ...editItem, vendor: e.target.value })
              }
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="w-1/2 border p-3 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 bg-blue-600 text-white p-3 rounded"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}