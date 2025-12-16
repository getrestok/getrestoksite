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
  vendorId?: string;   // ✅ NEW (preferred)
  vendor?: string;     // ⚠️ legacy fallback
  daysLast: number;
  notes?: string;
  category?: string;
  locationId?: string;
  createdAt?: any;
};

type VendorDoc = {
  id: string;
  name: string;
  email?: string | null;
  website?: string | null;
};

export default function ItemsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [alertedStatus, setAlertedStatus] =
    useState<Record<string, "low" | "out">>({});

  const [vendors, setVendors] = useState<VendorDoc[]>([]);
const [vendorId, setVendorId] = useState("");  

  // ADD
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [daysLast, setDaysLast] = useState("");
  const [vendor, setVendor] = useState("");

  // EDIT
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState<ItemDoc | null>(null);

  // DELETE CONFIRM
const [showDelete, setShowDelete] = useState(false);
const [deleteItem, setDeleteItem] = useState<ItemDoc | null>(null);

  // ============================
  // STATUS + PROGRESS
  // ============================
  function getStatus(item: ItemDoc) {
    if (!item.createdAt) return null;

    const created = item.createdAt.toDate();
    const diffDays = Math.floor(
      (Date.now() - created.getTime()) / 86400000
    );
    const daysLeft = item.daysLast - diffDays;

    if (daysLeft <= 0)
      return {
        label: "Due Today",
        color: "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
        daysLeft: 0,
      };

    if (daysLeft <= 3)
      return {
        label: "Running Low",
        color:
          "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
        daysLeft,
      };

    return {
      label: "OK",
      color:
        "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
      daysLeft,
    };
  }

  function getVendorName(item: ItemDoc) {
  if (item.vendorId) {
    const v = vendors.find((v) => v.id === item.vendorId);
    return v?.name || "—";
  }
  return item.vendor || "—"; // legacy fallback
}

  function getProgress(item: ItemDoc) {
    if (!item.createdAt) return 0;

    const created = item.createdAt.toDate();
    const diffDays = Math.floor(
      (Date.now() - created.getTime()) / 86400000
    );

    const daysLeft = Math.max(item.daysLast - diffDays, 0);
    const percent = (daysLeft / item.daysLast) * 100;

    return Math.min(100, Math.max(0, percent));
  }

  // ============================
  // AUTH + DATA
  // ============================
  useEffect(() => {
    let unsubItems: (() => void) | undefined;
    let unsubUser: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      onSnapshot(
  collection(db, "users", currentUser.uid, "vendors"),
  (snap) => {
    const vendorData = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as VendorDoc[];

    setVendors(vendorData);
  }
);

      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);

unsubUser = onSnapshot(userRef, (userSnap) => {
  const data = userSnap.data();

  if (!data?.orgId) return;

  setOrgId(data.orgId);

  const orgRef = doc(db, "organizations", data.orgId);

  onSnapshot(orgRef, (orgSnap) => {
    const rawPlan = orgSnap.data()?.plan;
    setPlan(rawPlan && rawPlan in PLANS ? rawPlan : "basic");
  });
});

      unsubItems = onSnapshot(
        collection(db, "users", currentUser.uid, "items"),
        (snap) => {
          const itemsData = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as ItemDoc[];

          setItems(itemsData);

          itemsData.forEach((item) => {
            if (!item.createdAt || !currentUser.email) return;

            const created = item.createdAt.toDate();
            const diffDays = Math.floor(
              (Date.now() - created.getTime()) / 86400000
            );
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
      unsubUser?.();
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
  vendorId: vendorId || null,
  daysLast: Number(daysLast),
  createdAt: serverTimestamp(),
});

    setName("");
    setDaysLast("");
    setVendorId("");
    setShowAdd(false);
  }

  async function handleRefillItem(id: string) {
    if (!user || !editItem) return;

    await updateDoc(doc(db, "users", user.uid, "items", editItem.id), {
  name: editItem.name,
  vendorId: editItem.vendorId || null,
  daysLast: Number(editItem.daysLast),
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
    <motion.div className="p-10 flex-1 max-w-5x1 mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        Items
      </h1>

      {/* PLAN INFO */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>{items.length}</strong> /{" "}
          {itemLimit === Infinity ? "∞" : itemLimit} items used
        </p>

        <span className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
          {PLANS[plan].name} Plan
        </span>
      </div>

      {atItemLimit && (
        <div className="mt-4 p-4 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-sm">
          You’ve reached your plan limit.
          <a href="/#pricing" className="ml-2 underline font-medium">
            Upgrade
          </a>
        </div>
      )}

      {/* HEADER */}
      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Your Items
        </h2>

        <button
          onClick={() => !atItemLimit && setShowAdd(true)}
          disabled={atItemLimit}
          className={`px-4 py-2 rounded-lg text-white ${
            atItemLimit
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-sky-600 hover:bg-sky-700"
          }`}
        >
          + Add Item
        </button>
      </div>

      {/* ITEMS */}
      <div className="mt-6 space-y-3">
{items.length === 0 && (
  <div className="p-10 border border-dashed rounded-xl text-center text-slate-500 dark:text-slate-400">
    <p className="text-lg font-medium">No items yet</p>
    <p className="text-sm mt-1">
      Add your first supply to start tracking restocks.
    </p>
  </div>
)}

        {items.map((item) => {
          const status = getStatus(item);

          return (
           <div
  key={item.id}
  className="
    p-4
    border border-slate-200 dark:border-slate-700
    rounded-xl
    flex justify-between items-center
    bg-white dark:bg-slate-800
    hover:shadow-sm
    hover:bg-slate-50 dark:hover:bg-slate-700
    transition-all
  "
>
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </h3>

                {status && (
                  <span
                    className={`mt-1 inline-block px-2 py-1 text-xs rounded ${status.color}`}
                  >
                    {status.label} • {status.daysLeft} days left
                  </span>
                )}

                <div className="mt-3 h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-700 ease-out ${
      status?.label === "Due Today"
        ? "bg-red-500"
        : status?.label === "Running Low"
        ? "bg-amber-500"
        : "bg-green-500"
    }`}
    style={{ width: `${getProgress(item)}%` }}
  />
</div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Vendor: {getVendorName(item)}
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRefillItem(item.id)}
                  className="px-3 py-1.5 rounded-md text-sm bg-green-500 hover:bg-green-600 text-white"
                >
                  Refill
                </button>
                <button
                  onClick={() => {
                    setEditItem(item);
                    setShowEdit(true);
                  }}
                  className="px-3 py-1.5 rounded-md text-sm bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Edit
                </button>
                <button
  onClick={() => {
    setDeleteItem(item);
    setShowDelete(true);
  }}
  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
            className="bg-white dark:bg-slate-800 p-6 rounded-xl space-y-4 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold">Add Item</h2>
            <input
              className="input"
              placeholder="Item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="input"
              type="number"
              placeholder="Days it lasts"
              value={daysLast}
              onChange={(e) => setDaysLast(e.target.value)}
              required
            />
           <select
  className="input"
  value={vendorId}
  onChange={(e) => setVendorId(e.target.value)}
>
  <option value="">Select vendor (optional)</option>
  {vendors.map((v) => (
    <option key={v.id} value={v.id}>
      {v.name}
    </option>
  ))}
</select>
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
            className="bg-white dark:bg-slate-800 p-6 rounded-xl space-y-4 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold">Edit Item</h2>
            <input
              className="input"
              value={editItem.name}
              onChange={(e) =>
                setEditItem({ ...editItem, name: e.target.value })
              }
            />
            <input
              className="input"
              type="number"
              value={editItem.daysLast}
              onChange={(e) =>
                setEditItem({
                  ...editItem,
                  daysLast: Number(e.target.value),
                })
              }
            />
            <select
  className="input"
  value={editItem.vendorId || ""}
  onChange={(e) =>
    setEditItem({ ...editItem, vendorId: e.target.value })
  }
>
  <option value="">Select vendor</option>
  {vendors.map((v) => (
    <option key={v.id} value={v.id}>
      {v.name}
    </option>
  ))}
</select>
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

      {/* DELETE CONFIRM MODAL */}
{showDelete && deleteItem && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Delete item?
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Are you sure you want to delete{" "}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {deleteItem.name}
        </span>
        ? This action cannot be undone.
      </p>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            setShowDelete(false);
            setDeleteItem(null);
          }}
          className="w-1/2 border border-slate-300 dark:border-slate-600 p-3 rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            await handleDeleteItem(deleteItem.id);
            setShowDelete(false);
            setDeleteItem(null);
          }}
          className="w-1/2 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
    </motion.div>
  );
}

