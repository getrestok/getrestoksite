"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PLANS } from "@/lib/plans";

export default function UsersPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user modal
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // -----------------------
  // AUTH + LOAD ORG + PLAN
  // -----------------------
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) return router.push("/login");

      setUser(u);

      onSnapshot(doc(db, "users", u.uid), (snap) => {
        const data = snap.data();
        if (!data?.orgId) return;

        setOrgId(data.orgId);

        onSnapshot(doc(db, "organizations", data.orgId), (orgSnap) => {
          const p = orgSnap.data()?.plan;
          setPlan(p && p in PLANS ? p : "basic");
        });
      });
    });
  }, [router]);

  // -----------------------
  // LOAD USERS IN ORG
  // -----------------------
  useEffect(() => {
    if (!orgId) return;

    return onSnapshot(
      query(collection(db, "users"), where("orgId", "==", orgId)),
      (snap) => {
        setMembers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      }
    );
  }, [orgId]);

  const memberLimit =
    plan === "pro"
      ? 5
      : plan === "premium"
      ? Infinity
      : 1;

  const atLimit =
    memberLimit !== Infinity && members.length >= memberLimit;

  // -----------------------
  // CREATE USER
  // -----------------------
  async function createUser(e: any) {
    e.preventDefault();
    if (!orgId) return;

    const res = await fetch("/api/org/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        orgId,
      }),
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    setEmail("");
    setPassword("");
    setShowAdd(false);
  }

  return (
    <motion.main
      className="p-10 flex-1 max-w-5xl mx-auto"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-bold">Users</h1>

      <p className="text-slate-600 dark:text-slate-400 mt-2">
        Manage people in your organization.
      </p>

      {/* PLAN INFO */}
      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {memberLimit === Infinity ? (
          <>Unlimited members</>
        ) : (
          <>
            {members.length} / {memberLimit} seats used
          </>
        )}
      </div>

      {/* RESTRICTION */}
      {(plan === "basic" || plan === "enterprise") && (
        <div className="mt-4 p-4 border rounded bg-amber-50 dark:bg-amber-900/20 text-sm">
          Only Pro and Premium plans support team users.
        </div>
      )}

      {/* HEADER */}
      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          Organization Members
        </h2>

        {(plan === "pro" || plan === "premium") && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => !atLimit && setShowAdd(true)}
            disabled={atLimit}
            className={`px-4 py-2 rounded-lg text-white ${
              atLimit
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-sky-600 hover:bg-sky-700"
            }`}
          >
            + Add User
          </motion.button>
        )}
      </div>

      {/* LIST */}
      <div className="mt-6 space-y-3">
        {loading && (
          <div className="p-8 text-center text-slate-500">
            Loading users…
          </div>
        )}

        {!loading && members.length === 0 && (
          <div className="p-8 border border-dashed rounded-xl text-center text-slate-500">
            No users yet.
          </div>
        )}

        {members.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{m.email}</div>
              <div className="text-xs text-slate-500">
                {m.role === "owner" ? "Owner" : "Member"}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ADD USER MODAL */}
      {showAdd && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.form
            onSubmit={createUser}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4 shadow-xl"
          >
            <h2 className="text-lg font-semibold">
              Add New User
            </h2>

            <input
              className="input"
              placeholder="User email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="input"
              placeholder="Temporary password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-1/2 border p-3 rounded"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="w-1/2 bg-sky-600 hover:bg-sky-700 text-white p-3 rounded"
              >
                Create User
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </motion.main>
  );
}