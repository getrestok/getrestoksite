"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type VendorDoc = {
  id: string;
  name: string;
  email?: string | null;
  website?: string | null;
  createdAt?: any;
};

export default function VendorsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [vendors, setVendors] = useState<VendorDoc[]>([]);

  // ADD / EDIT
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorDoc | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");

  // DELETE CONFIRM
  const [deleteVendor, setDeleteVendor] = useState<VendorDoc | null>(null);

  // -------------------------
  // AUTH + LOAD VENDORS
  // -------------------------
  useEffect(() => {
    let unsubVendors: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      unsubVendors = onSnapshot(
        collection(db, "users", u.uid, "vendors"),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setVendors(data);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubVendors?.();
    };
  }, [router]);

  // -------------------------
  // SAVE VENDOR
  // -------------------------
  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      website: website.trim() || null,
      updatedAt: serverTimestamp(),
    };

    if (editingVendor) {
      await updateDoc(
        doc(db, "users", user.uid, "vendors", editingVendor.id),
        payload
      );
    } else {
      await addDoc(collection(db, "users", user.uid, "vendors"), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }

    resetModal();
  }

  function resetModal() {
    setShowModal(false);
    setEditingVendor(null);
    setName("");
    setEmail("");
    setWebsite("");
  }

  // -------------------------
  // DELETE VENDOR (SAFE)
  // -------------------------
  async function handleDeleteVendor(vendor: VendorDoc) {
    if (!user) return;

    // Prevent deleting vendors still used by items
    const itemsSnap = await getDocs(
      query(
        collection(db, "users", user.uid, "items"),
        where("vendorId", "==", vendor.id)
      )
    );

    if (!itemsSnap.empty) {
      alert("This vendor is currently used by one or more items.");
      return;
    }

    await deleteDoc(doc(db, "users", user.uid, "vendors", vendor.id));
    setDeleteVendor(null);
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <motion.main
      className="p-10 flex-1 max-w-5xl mx-auto"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Vendors
        </h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
        >
          + Add Vendor
        </button>
      </div>

      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Manage the vendors you reorder supplies from.
      </p>

      {/* LIST */}
      <div className="mt-6 space-y-3">
        {vendors.length === 0 && (
          <div className="p-10 border border-dashed rounded-xl text-center text-slate-500 dark:text-slate-400">
            No vendors yet.
          </div>
        )}

        {vendors.map((v) => (
          <div
            key={v.id}
            className="p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {v.name}
              </h3>

              <div className="text-sm text-slate-500 dark:text-slate-400">
                {v.email && <div>📧 {v.email}</div>}
                {v.website && <div>🌐 {v.website}</div>}
                {!v.email && !v.website && <div>No contact info</div>}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingVendor(v);
                  setName(v.name);
                  setEmail(v.email || "");
                  setWebsite(v.website || "");
                  setShowModal(true);
                }}
                className="px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm"
              >
                Edit
              </button>

              <button
                onClick={() => setDeleteVendor(v)}
                className="px-3 py-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSaveVendor}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4"
          >
            <h2 className="text-xl font-semibold">
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </h2>

            <input
              required
              className="input"
              placeholder="Vendor name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="input"
              placeholder="Vendor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input"
              placeholder="Vendor website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={resetModal}
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

      {/* DELETE CONFIRM */}
      {deleteVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete vendor?</h2>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <strong>{deleteVendor.name}</strong>? This cannot be undone.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteVendor(null)}
                className="w-1/2 border p-3 rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDeleteVendor(deleteVendor)}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white p-3 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}