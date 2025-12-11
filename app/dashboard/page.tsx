"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  // Modal open/close
  const [showModal, setShowModal] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [daysLast, setDaysLast] = useState("");
  const [vendor, setVendor] = useState("");

  // Check auth + fetch items
 useEffect(() => {
  let unsubscribeItems: any = null;

  const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);

    // Real-time Firestore listener
    unsubscribeItems = onSnapshot(
      collection(db, "users", currentUser.uid, "items"),
      (snap) => {
        setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );
  });

  return () => {
    unsubAuth();
    if (unsubscribeItems) unsubscribeItems();
  };
}, []);


  async function handleAddItem(e: any) {
    e.preventDefault();
    if (!user) return;

    await addDoc(collection(db, "users", user.uid, "items"), {
      name,
      daysLast: Number(daysLast),
      vendor,
      createdAt: serverTimestamp(),
    });

    // Reset form + close modal
    setName("");
    setDaysLast("");
    setVendor("");
    setShowModal(false);
  }

  return (
    <div className="min-h-screen p-10 bg-slate-50">
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
                <div key={item.id} className="p-4 border rounded-lg flex justify-between">
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-slate-500 text-sm">
                      Lasts {item.daysLast} days • From {item.vendor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================== */}
      {/* ADD ITEM MODAL */}
      {/* ======================== */}
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
                  placeholder="Paper Towels"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Days it lasts</label>
                <input
                  type="number"
                  value={daysLast}
                  onChange={(e) => setDaysLast(e.target.value)}
                  className="w-full p-3 mt-1 border rounded-lg"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600">Vendor</label>
                <input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full p-3 mt-1 border rounded-lg"
                  placeholder="Amazon / Staples / etc."
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
    </div>
  );
}
