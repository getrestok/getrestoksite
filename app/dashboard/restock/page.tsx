"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../../../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PLANS } from "@/lib/plans";

async function setReorderMethod(
  itemId: string,
  method: "email" | "website"
) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  await updateDoc(doc(db, "users", uid, "items", itemId), {
    reorderMethod: method,
  });
}

type ItemDoc = {
  id: string;
  name: string;
  vendorId?: string | null;
  reorderMethod?: "email" | "website";
};

type VendorDoc = {
  id: string;
  name: string;
  email?: string | null;
  website?: string | null;
};

export default function RestockPage() {
  const router = useRouter();

  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const focusedItemId = searchParams?.get("itemId");

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorDoc>>({});
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [showSavingsModal, setShowSavingsModal] = useState(false);

  const isProOrHigher =
    plan === "pro" || plan === "premium" || plan === "enterprise";

  // ----------------------------
  // AUTH + LOAD DATA
  // ----------------------------
  useEffect(() => {
    let unsubItems: (() => void) | undefined;
    let unsubVendors: (() => void) | undefined;
    let unsubUser: (() => void) | undefined;
    let unsubOrg: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      // USER → ORG → PLAN
      unsubUser = onSnapshot(doc(db, "users", currentUser.uid), (userSnap) => {
        const orgId = userSnap.data()?.orgId;
        if (!orgId) return;

        unsubOrg?.();
        unsubOrg = onSnapshot(doc(db, "organizations", orgId), (orgSnap) => {
          const rawPlan = orgSnap.data()?.plan;
          setPlan(rawPlan && rawPlan in PLANS ? rawPlan : "basic");
        });
      });

      // VENDORS
      unsubVendors = onSnapshot(
        collection(db, "users", currentUser.uid, "vendors"),
        (snap) => {
          const map: Record<string, VendorDoc> = {};
          snap.docs.forEach((d) => {
            map[d.id] = { id: d.id, ...(d.data() as any) };
          });
          setVendors(map);
        }
      );

      // ITEMS
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
      unsubVendors?.();
      unsubUser?.();
      unsubOrg?.();
    };
  }, [router]);

  // ----------------------------
  // HELPERS
  // ----------------------------
  function isInnerSpaceVendor(v?: VendorDoc) {
    if (!v?.name) return false;
    const n = v.name.toLowerCase();
    return n.includes("inner space") || n.includes("issi");
  }

  function normalizeWebsite(url?: string) {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  }

  function buildVendorSearchUrl(vendor: VendorDoc, itemName: string) {
    if (!vendor.website) return null;

    const site = normalizeWebsite(vendor.website)!;
    const q = encodeURIComponent(itemName);
    const host = site.toLowerCase();

    if (host.includes("amazon")) return `https://www.amazon.com/s?k=${q}`;
    if (host.includes("walmart")) return `https://www.walmart.com/search?q=${q}`;
    if (host.includes("staples")) return `https://www.staples.com/search?query=${q}`;
    if (host.includes("officedepot"))
      return `https://www.officedepot.com/catalog/search.do?query=${q}`;
    if (host.includes("costco"))
      return `https://www.costco.com/CatalogSearch?keyword=${q}`;

    return `https://www.google.com/search?q=site:${encodeURIComponent(
      new URL(site).hostname
    )}+${q}`;
  }

  function buildInnerSpaceEmail(item: ItemDoc) {
    const subject = `Restock Request – ${item.name}`;
    const body = `Hello Inner Space Systems,

I would like to place a restock order for:

Item: ${item.name}

This request was sent from Restok (getrestok.com).

Thank you,
${user?.displayName || "—"}`;

    return `mailto:sales@issioffice.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  }

  function buildVendorEmail(vendor: VendorDoc, item: ItemDoc) {
    const subject = `Restock Request – ${item.name}`;
    const body = `Hello ${vendor.name},

I would like to place a restock order for:

Item: ${item.name}

Thank you,
${user?.displayName || "—"}`;

    return `mailto:${vendor.email}?subject=${encodeURIComponent(
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
        Reorder items using your saved vendors.
      </p>

      <div className="mt-6 space-y-4">
        {items.map((item) => {
          const vendor = item.vendorId
            ? vendors[item.vendorId]
            : undefined;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex justify-between items-center transition
                ${
                  focusedItemId === item.id
                    ? "bg-sky-50 dark:bg-sky-900/30 border-sky-400"
                    : "bg-white dark:bg-slate-800 dark:border-slate-700"
                }
              `}
            >
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Vendor: {vendor?.name || "Not set"}
                </p>
              </div>

              {!vendor ? (
                <span className="text-xs italic text-slate-400">
                  No vendor linked
                </span>
              ) : isInnerSpaceVendor(vendor) ? (
                <a
                  href={buildInnerSpaceEmail(item)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm"
                >
                  Email Inner Space
                </a>
              ) : (
                <div className="flex items-center gap-3">
                  {vendor.email && vendor.website && (
                    <div className="flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600">
                      {(["email", "website"] as const).map((method) => (
                        <button
                          key={method}
                          onClick={() => setReorderMethod(item.id, method)}
                          className={`px-3 py-1 text-xs ${
                            item.reorderMethod === method ||
                            (!item.reorderMethod && method === "email")
                              ? "bg-sky-600 text-white"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {method === "email" ? "Email" : "Website"}
                        </button>
                      ))}
                    </div>
                  )}

                  {((item.reorderMethod ?? "email") === "email" &&
                  vendor.email) ? (
                    <a
                      href={buildVendorEmail(vendor, item)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
                    >
                      Email Vendor
                    </a>
                  ) : vendor.website ? (
                    <a
                      href={buildVendorSearchUrl(vendor, item.name)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
                    >
                      Search for item
                    </a>
                  ) : (
                    <span className="text-xs italic text-slate-400">
                      No contact info
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.main>
  );
}