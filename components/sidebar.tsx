"use client";

import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import { auth, db } from "../lib/firebase";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

type Plan = "basic" | "pro" | "premium" | "enterprise";

export default function Sidebar() {
  const [plan, setPlan] = useState<Plan>("basic");
  const [role, setRole] =
    useState<"owner" | "admin" | "member">("member");
  const [loading, setLoading] = useState(true);

  const [showSupport, setShowSupport] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  // Load user + plan
  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubOrg: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Support metadata
      fetch("/api/me")
        .then((r) => r.json())
        .then((d) => setUserInfo(d))
        .catch(() => null);

      unsubUser = onSnapshot(doc(db, "users", user.uid), (userSnap) => {
        const data = userSnap.data();
        if (!data) {
          setLoading(false);
          return;
        }

        setRole(data.role || "member");

        const orgId = data.orgId;
        if (!orgId) {
          setLoading(false);
          return;
        }

        unsubOrg?.();

        unsubOrg = onSnapshot(doc(db, "organizations", orgId), (orgSnap) => {
          const rawPlan = orgSnap.data()?.plan;

          setPlan(
            rawPlan === "pro" ||
              rawPlan === "premium" ||
              rawPlan === "enterprise"
              ? rawPlan
              : "basic"
          );

          setLoading(false);
        });
      });
    });

    return () => {
      unsubAuth();
      unsubUser?.();
      unsubOrg?.();
    };
  }, []);

  return (
    <>
      {/* SIDEBAR */}
      <aside
        className="
        hidden md:flex
        fixed
        left-0 top-0
        h-screen
        w-64
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700
        p-6
        flex-col
      "
      >
        {/* Logo */}
        <img src="/logo.svg" alt="Restok Logo" className="w-12 h-12 mb-4" />

        <motion.h1
          className="text-2xl font-bold mb-8 text-slate-800 dark:text-slate-100"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Restok
        </motion.h1>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 text-slate-700 dark:text-slate-200">
          <NavItem href="/dashboard" label="Dashboard" emoji="📊" />
          <NavItem href="/dashboard/items" label="Items" emoji="📦" />
          <NavItem href="/dashboard/vendors" label="Vendors" emoji="🏪" />
          <NavItem href="/dashboard/restock" label="Restock" emoji="🧾" />
          <NavItem href="/dashboard/reports" label="Reports" emoji="📝" />

          {/* ALWAYS SHOW USERS */}
          <NavItem href="/dashboard/users" label="Users" emoji="👥" />

          <NavItem href="/dashboard/settings" label="Settings" emoji="⚙️" />
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-3 pt-6">
          {/* PLAN STATUS */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                Plan
              </span>

              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold
                ${
                  plan === "basic"
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    : plan === "pro"
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                    : plan === "premium"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                }
              `}
              >
                {loading ? "..." : plan.toUpperCase()}
              </span>
            </div>

            {!loading && plan !== "enterprise" && (
              <button
                onClick={() =>
                  (window.location.href =
                    "/dashboard/settings#billing")
                }
                className="mt-2 w-full text-xs bg-sky-600 hover:bg-sky-700 text-white py-1.5 rounded-md"
              >
                {plan === "basic" ? "Upgrade plan" : "Manage plan"}
              </button>
            )}
          </div>

          <ThemeToggle />

          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            💬 Support
          </button>

          <motion.button
            onClick={() => auth.signOut()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg"
          >
            Log Out
          </motion.button>
        </div>
      </aside>

      {/* SUPPORT MODAL */}
      {showSupport && userInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const form = new FormData(e.currentTarget);
              if (file) form.append("file", file);
              form.append("metadata", JSON.stringify(userInfo));

              const res = await fetch("/api/support", {
                method: "POST",
                body: form,
              });

              if (res.ok) alert("Support message sent!");
              else alert("Failed to send support message");

              setShowSupport(false);
            }}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl w-full max-w-md shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4">
              Contact Support
            </h2>

            <div className="text-sm mb-3 p-3 rounded bg-slate-100 dark:bg-slate-800">
              <div>
                <strong>User:</strong> {userInfo?.name}
              </div>
              <div>
                <strong>Email:</strong> {userInfo?.email}
              </div>
              <div>
                <strong>Org:</strong> {userInfo?.orgName}
              </div>
              <div>
                <strong>Plan:</strong> {userInfo?.plan}
              </div>
            </div>

            <input
              name="subject"
              placeholder="Subject"
              required
              className="input mb-3"
            />

            <textarea
              name="message"
              placeholder="Describe your issue…"
              required
              className="input h-36 mb-4"
            />

            <label className="text-sm mb-2 block">
              Screenshot / file (optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf,.txt"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              className="mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSupport(false)}
                className="w-1/2 border p-3 rounded"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="w-1/2 bg-sky-600 hover:bg-sky-700 text-white p-3 rounded"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* ---------------- NAV ITEM ---------------- */
function NavItem({
  href,
  emoji,
  label,
}: {
  href: string;
  emoji: string;
  label: string;
}) {
  return (
    <motion.a
      href={href}
      whileHover={{ x: 4 }}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {emoji} {label}
    </motion.a>
  );
}