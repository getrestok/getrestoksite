"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  // Add item modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [daysLast, setDaysLast] = useState("");
  const [vendor, setVendor] = useState("");

  // Edit item modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // AUTH + ITEM SUBSCRIPTION
  useEffect(() => {
    let unsubscribeItems: any = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      unsubscribeItems = onSnapshot(
        collection(db, "users", currentUser.uid, "items"),
        (snap) => {
          setItems(
            snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
          );
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubscribeItems) unsubscribeItems();
    };
  }, [router]);

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
    setShowModal(false);
  }

  // DELETE ITEM
  async function handleDeleteItem(itemId: string) {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "items", itemId));
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

    setShowEditModal(false);
    setEditItem(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ========================= */}
      {/* SIDEBAR */}
      {/* ========================= */}
      <aside className="w-64 bg-white border-r p-6 hidden md:flex flex-col">
        <h1 className="text-2xl font-bold mb-8">StockPilot</h1>

        <nav className="flex flex-col gap-2">
          <a
            href="/dashboard"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            📊 Dashboard
          </a>

          <a
            href="/dashboard"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            📦 Items
          </a>

          <a
            href="#"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100"
          >
            ⚙️ Settings
          </a>
        </nav>

        <button
          onClick={() => signOut(auth)}
          className="mt-auto w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
        >
          Log Out
        </button>
      </aside>

      {/* ========================= */}
      {/* MAIN CONTENT */}
      {/* ========================= */}
      <main className="flex-1 p-10">
        <div className="max-w-4xl mx-auto">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>

            <button
              onClick={() => signOut(auth)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Log out
            </button>
          </div>

          {/* ITEMS PANEL */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Items</h2>

              <button
                onClick={() => setShowModal(true)}
                className="bg-sky-600 text-white px-4 py-2 rounded-lg"
              >
                + Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-slate-500">No items yet! Add your first one.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-100 transition"
                  >
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-slate-500 text-sm">
                        Lasts {item.daysLast} days • From {item.vendor}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditItem(item);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================= */}
      {/* ADD ITEM MODAL */}
      {/* ========================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold">Add New Item</h2>

            <form onSubmit={handleAddItem} className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-slate-600">Item name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Days it lasts</label>
                <input
                  type="number"
                  value={daysLast}
                  onChange={(e) => setDaysLast(e.target.value)}
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Vendor</label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 p-3 rounded-lg border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-1/2 bg-sky-600 text-white p-3 rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/* EDIT ITEM MODAL */}
      {/* ========================= */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold">Edit Item</h2>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-slate-600">Item name</label>
                <input
                  value={editItem.name}
                  onChange={(e) =>
                    setEditItem({ ...editItem, name: e.target.value })
                  }
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Days it lasts</label>
                <input
                  type="number"
                  value={editItem.daysLast}
                  onChange={(e) =>
                    setEditItem({ ...editItem, daysLast: e.target.value })
                  }
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Vendor</label>
                <input
                  value={editItem.vendor}
                  onChange={(e) =>
                    setEditItem({ ...editItem, vendor: e.target.value })
                  }
                  className="w-full p-3 mt-1 border rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditItem(null);
                  }}
                  className="w-1/2 p-3 rounded-lg border"
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
          </div>
        </div>
      )}

    </div>
  );
}
