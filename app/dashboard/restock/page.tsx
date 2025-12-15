"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type ItemDoc = {
  id: string;
  name: string;
  vendor?: string;
  vendorEmail?: string;
  vendorWebsite?: string;
};

export default function RestockPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);

  useEffect(() => {
    let unsubItems: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      unsubItems = onSnapshot(
        collection(db, "users", currentUser.uid, "items"),
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setItems(data);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubItems?.();
    };
  }, [router]);

  function buildEmail(item: ItemDoc) {
    const subject = `Restock Request – ${item.name}`;
    const body = `Hello${item.vendor ? " " + item.vendor : ""},

We would like to place a restock order for:

• Item: ${item.name}

Please let us know pricing, availability, and next steps.

Thank you,
${user?.displayName || "—"}`;

    return `mailto:${item.vendorEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

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
        Quickly contact vendors or place restock orders.
      </p>

      {items.length === 0 && (
        <div className="mt-10 p-10 border border-dashed rounded-xl text-center text-slate-500">
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
                Vendor: {item.vendor || "—"}
              </p>
            </div>

            <div className="flex gap-2">
              {item.vendorEmail && (
                <a
                  href={buildEmail(item)}
                  className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
                >
                  Email Vendor
                </a>
              )}

              {item.vendorWebsite && (
                <a
                  href={item.vendorWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm"
                >
                  Visit Website
                </a>
              )}

              {!item.vendorEmail && !item.vendorWebsite && (
                <span className="text-xs text-slate-400 italic">
                  No vendor contact info
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.main>
  );
}