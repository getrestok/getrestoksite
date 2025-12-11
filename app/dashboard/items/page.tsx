"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";

export default function ItemsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  // MODALS
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // FIELDS
  const [name, setName] = useState("");
  const [daysLast, setDaysLast] = useState("");
  const [vendor, setVendor] = useState("");

  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  // AUTH + FETCH
  useEffect(() => {
    let unsubItems: any;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) return router.push("/login");

      setUser(currentUser);

      unsubItems = onSnapshot(
        collection(db, "users", currentUser.uid, "items"),
        (snap) => {
          setItems(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }))
          );
        }
      );
    });

    return () => {
      unsubAuth();
      unsubItems?.();
    };
  }, []);

  // ADD ITEM
  async function handleAddItem(e: any) {
    e.preventDefault();
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "items"), {
      name,
      daysLast: Number(daysLast),
      vendor,
      createdAt: serverTimestamp(),
    });

    setName("");
    setDaysLast("");
    setVendor("");
    setShowAdd(false);
  }

  // EDIT ITEM
  async function handleEditSubmit(e: any) {
    e.preventDefault();
    if (!user || !editItem) return;

    await updateDoc(doc(db, "users", user.uid, "items", editItem.id), {
      name: editItem.name,
      daysLast: Number(editItem.daysLast),
      vendor: editItem.vendor,
    });

    setShowEdit(false);
    setEditItem(null);
  }

  // DELETE ITEM
  async function handleDeleteItem(id: string) {
    await deleteDoc(doc(db, "users", user.uid, "items", id));
  }

  // REFILL
  async function handleRefillItem(id: string) {
    await updateDoc(doc(db, "users", user.uid, "items", id), {
      createdAt: serverTimestamp(),
    });
  }

  // STATUS BADGE
  function getStatus(item: any) {
    if (!item.createdAt) return null;

    const created = item.createdAt.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / 86400000);

    const daysLeft = item.daysLast - diff;

    if (daysLeft <= 0) return { label: "Due Today", color: "bg-red-100 text-red-700", daysLeft: 0 };
    if (daysLeft <= 3) return { label: "Running Low", color: "bg-amber-100 text-amber-700", daysLeft };
    return { label: "OK", color: "bg-green-100 text-green-700", daysLeft };
  }

  return (
    <motion.div className="p-10 flex-1"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold">Items</h1>

      {/* ITEMS PANEL */}
      <motion.div
        className="mt-8 bg-white p-6 rounded-xl shadow"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Items</h2>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAdd(true)}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg"
          >
            + Add Item
          </motion.button>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const status = getStatus(item);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-100 transition"
              >
                <div>
                  <h3 className="font-semibold">{item.name}</h3>

                  {status && (
                    <span className={`mt-1 inline-block px-2 py-1 text-xs rounded ${status.color}`}>
                      {status.label} • {status.daysLeft} days left
                    </span>
                  )}

                  <p className="text-slate-500 text-sm mt-2">
                    From: {item.vendor} <br />
                    Last refilled:{" "}
                    {item.createdAt
                      ? item.createdAt.toDate().toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setEditItem(item);
                      setShowEdit(true);
                    }}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md"
                  >
                    Edit
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setDeleteItemId(item.id);
                      setShowDelete(true);
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded-md"
                  >
                    Delete
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleRefillItem(item.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded-md"
                  >
                    Refill
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ============================= */}
      {/* ADD MODAL */}
      {/* ============================= */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-xl p-6 shadow"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
            >
              <h2 className="text-xl font-semibold">Add Item</h2>

              <form onSubmit={handleAddItem} className="space-y-4 mt-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item Name"
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  type="number"
                  value={daysLast}
                  onChange={(e) => setDaysLast(e.target.value)}
                  placeholder="Days it lasts"
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Vendor"
                  className="w-full border p-3 rounded-lg"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="w-1/2 p-3 border rounded-lg"
                  >
                    Cancel
                  </button>

                  <button type="submit" className="w-1/2 bg-sky-600 text-white p-3 rounded-lg">
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================= */}
      {/* EDIT MODAL */}
      {/* ============================= */}
      <AnimatePresence>
        {showEdit && editItem && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-md rounded-xl p-6 shadow"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
            >
              <h2 className="text-xl font-semibold">Edit Item</h2>

              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                <input
                  value={editItem.name}
                  onChange={(e) =>
                    setEditItem({ ...editItem, name: e.target.value })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  type="number"
                  value={editItem.daysLast}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      daysLast: Number(e.target.value),
                    })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  value={editItem.vendor}
                  onChange={(e) =>
                    setEditItem({
                      ...editItem,
                      vendor: e.target.value,
                    })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="w-1/2 p-3 border rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-1/2 bg-blue-600 text-white p-3 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================= */}
      {/* DELETE MODAL */}
      {/* ============================= */}
      <AnimatePresence>
        {showDelete && deleteItemId && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white w-full max-w-sm rounded-xl p-6 shadow text-center"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
            >
              <h2 className="text-xl font-semibold">Delete Item?</h2>
              <p className="text-slate-600 mt-2">This action cannot be undone.</p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDeleteItemId(null);
                  }}
                  className="w-1/2 p-3 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    handleDeleteItem(deleteItemId);
                    setShowDelete(false);
                    setDeleteItemId(null);
                  }}
                  className="w-1/2 bg-red-600 text-white p-3 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
