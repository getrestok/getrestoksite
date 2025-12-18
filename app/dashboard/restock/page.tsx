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

const modalBackdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalPanel = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 18 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 }
  }
};

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

  // ----------------------------
// REVIEW ITEMS FROM DASHBOARD
// ----------------------------
const searchParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

const reviewIds: string[] =
  searchParams?.get("review")?.split(",").filter(Boolean) ?? [];

  

  

  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<ItemDoc[]>([]);
  const [vendors, setVendors] = useState<Record<string, VendorDoc>>({});
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [showRestockConfirm, setShowRestockConfirm] = useState(false);
const [restockingItem, setRestockingItem] = useState<ItemDoc | null>(null);

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

    const searchParams =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;

const reviewIds =
  searchParams?.get("review")?.split(",") ?? [];


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

      {/* PRO+ UPSELL */}
{isProOrHigher && (
  <div className="mt-6 p-4 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 flex justify-between items-center">
    <p className="text-sm text-sky-800 dark:text-sky-200">
      💡 Want to potentially save money on your office supplies?
    </p>
    <button
      onClick={() => setShowSavingsModal(true)}
      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
    >
      Learn more
    </button>
  </div>
)}

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
      reviewIds.includes(item.id)
        ? "bg-amber-50 dark:bg-amber-900/30 border-amber-400"
        : "bg-white dark:bg-slate-800 dark:border-slate-700"
    }
  `}
>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.name}
                </h3>
                {reviewIds.includes(item.id) && (
  <span className="inline-block mt-1 text-xs px-2 py-1 rounded
    bg-amber-200 dark:bg-amber-800
    text-amber-900 dark:text-amber-100">
    Needs attention
  </span>
)}
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
                    <button
  onClick={() => {
    window.location.href = buildVendorEmail(vendor, item);
    setRestockingItem(item);
    setShowRestockConfirm(true);
  }}
  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
>
  Email Vendor
</button>
                  ) : vendor.website ? (
                    <button
  onClick={() => {
    window.open(buildVendorSearchUrl(vendor, item.name)!, "_blank");
    setRestockingItem(item);
    setShowRestockConfirm(true);
  }}
  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm"
>
  Search for item
</button>
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

      {/* SAVINGS MODAL */}
{showSavingsModal && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Save on Office Supplies
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        You can potentially save money on your office supplies by switching your
        vendor to <strong>Inner Space Systems</strong>.
        <br />
        <br />
        Set ISSI as your vendor to see how much you could save!
      </p>

      <a
        href="https://www.issioffice.com/office-supplies"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-md"
      >
        Check out ISSI's website
      </a>

      <button
        onClick={() => setShowSavingsModal(false)}
        className="w-full border border-slate-300 dark:border-slate-600 py-2 rounded-md text-slate-700 dark:text-slate-200"
      >
        Close
      </button>
    </div>
  </div>
)}
{/* RESTOCK CONFIRM MODAL */}
{showRestockConfirm && restockingItem && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-md w-full space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Restock item?
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Did you restock{" "}
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {restockingItem.name}
        </span>
        ?
      </p>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => {
            setShowRestockConfirm(false);
            setRestockingItem(null);
          }}
          className="w-1/2 border border-slate-300 dark:border-slate-600 py-2 rounded-md"
        >
          Not yet
        </button>

        <button
          onClick={async () => {
            if (!user) return;

            await updateDoc(
              doc(db, "users", user.uid, "items", restockingItem.id),
              {
                createdAt: new Date(),
              }
            );

            setShowRestockConfirm(false);
            setRestockingItem(null);

            // Clean URL (remove ?itemId)
            router.replace("/dashboard/restock");
          }}
          className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
        >
          Yes, restocked
        </button>
      </div>
    </div>
  </div>
)}

    </motion.main>
  );
}