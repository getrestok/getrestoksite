"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getVendorConfig } from "@/lib/vendors";
import { PLANS } from "@/lib/plans";

type ItemDoc = {
  id: string;
  name: string;
  vendor?: string;
};

export default function RestockPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showSavingsModal, setShowSavingsModal] = useState(false);

  const isProOrHigher =
    plan === "pro" || plan === "premium" || plan === "enterprise";

  // ----------------------------
  // AUTH + LOAD ITEMS
  // ----------------------------
useEffect(() => {
  let unsubItems: (() => void) | undefined;
  let unsubUser: (() => void) | undefined;

  const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setUser(currentUser);

    // Load plan
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

    // Load items
    unsubItems = onSnapshot(
      collection(db, "users", currentUser.uid, "items"),
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as ItemDoc[];

        setItems(data);
      }
    );
  });

  return () => {
    unsubAuth();
    unsubItems?.();
    unsubUser?.();
  };
}, [router]);

  // ----------------------------
  // INNER SPACE DETECTION
  // ----------------------------
  function isInnerSpaceVendor(vendor?: string) {
    if (!vendor) return false;
    const v = vendor.toLowerCase();
    return v.includes("inner space") || v.includes("issi");
  }

  function buildInnerSpaceEmail(item: ItemDoc) {
    const subject = `Restock Request – ${item.name}`;
    const body = `Hello Inner Space Systems,

I would like to place a restock order for the following item:

Item: ${item.name}

This request was sent from the Restok app.

Thank you,
${user?.displayName || "—"}`;

    return `mailto:sales@issioffice.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <motion.main
      className="p-10 flex-1 max-w-5xl mx-auto"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        Restock
      </h1>

      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Quickly reorder items from your vendors.
      </p>

      {/* PRO+ UPSELL */}
      {isProOrHigher && (
        <div className="mt-6 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 flex items-center justify-between">
          <p className="text-sm text-sky-800 dark:text-sky-200">
            💡 Would you like to potentially save money on your office supplies?
          </p>
          <button
            onClick={() => setShowSavingsModal(true)}
            className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
          >
            Learn more
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div className="mt-10 p-10 border border-dashed rounded-xl text-center text-slate-500 dark:text-slate-400">
          No items available to restock.
        </div>
      )}

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {item.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vendor: {item.vendor || "Unknown"}
              </p>
            </div>

            {isInnerSpaceVendor(item.vendor) ? (
              <a
                href={buildInnerSpaceEmail(item)}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                Email Inner Space
              </a>
            ) : (
              <a
                href={getVendorConfig(item.vendor).buildUrl(item.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
              >
                Reorder
              </a>
            )}
          </div>
        ))}
      </div>

      {/* SAVINGS MODAL */}
      {showSavingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Save on Office Supplies
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              You can potentially save money on your office supplies by switching
              your vendor to <strong>Inner Space Systems</strong>.
            </p>

            <a
              href="https://www.issioffice.com/office-supplies"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full text-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
            >
              Learn More
            </a>

            <button
              onClick={() => setShowSavingsModal(false)}
              className="w-full border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </motion.main>
  );
}