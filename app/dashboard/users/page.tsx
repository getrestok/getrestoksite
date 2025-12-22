"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PLANS } from "@/lib/plans";



export default function UsersPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [plan, setPlan] = useState<keyof typeof PLANS>("basic");
  const [role, setRole] =
    useState<"owner" | "admin" | "member">("member");

  const [planLoaded, setPlanLoaded] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [initializing, setInitializing] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");

  // ----------------------
  // AUTH + ORG + ROLE + PLAN
  // ----------------------
  useEffect(() => {
    let unsubUser: any;
    let unsubOrg: any;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) return router.push("/login");

      setUser(u);

      unsubUser = onSnapshot(doc(db, "users", u.uid), (snap) => {
        const data = snap.data();
        if (!data?.orgId) return;

        setOrgId(data.orgId);
        setRole(data.role || "member");

        unsubOrg?.();
        unsubOrg = onSnapshot(
          doc(db, "organizations", data.orgId),
          (orgSnap) => {
            const p = orgSnap.data()?.plan;
            setPlan(
              p === "pro" || p === "premium" || p === "enterprise"
                ? p
                : "basic"
            );
            setPlanLoaded(true);
          }
        );

        setInitializing(false);
      });
    });

    return () => {
      unsubAuth();
      unsubUser?.();
      unsubOrg?.();
    };
  }, [router]);

  // ----------------------
  // LOAD MEMBERS
  // ----------------------
  useEffect(() => {
    if (!orgId) return;

    return onSnapshot(
      query(collection(db, "users"), where("orgId", "==", orgId)),
      (snap) => {
        setMembers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoadingMembers(false);
      }
    );
  }, [orgId]);

  // ----------------------
  // SEAT LIMITS
  // ----------------------
  const memberLimit =
    plan === "pro"
      ? 5
      : plan === "premium" || plan === "enterprise"
      ? Infinity
      : 1;

  const atLimit =
    memberLimit !== Infinity && members.length >= memberLimit;

  const adminCount = members.filter(
    (m) => m.role === "admin" || m.role === "owner"
  ).length;

  const isLastAdmin = (m: any) =>
    (m.role === "admin" || m.role === "owner") &&
    adminCount <= 1;

  // ----------------------
  // ACTIONS
  // ----------------------
  async function createUser(e: any) {
    e.preventDefault();
    if (!orgId) return;

    const token = await auth.currentUser?.getIdToken();

    const res = await fetch("/api/org/invite-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, orgId }),
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    setEmail("");
    setShowAdd(false);
  }

  async function updateRole(uid: string, newRole: string) {
    const token = await auth.currentUser?.getIdToken();

    const res = await fetch("/api/org/update-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, role: newRole }),
    });

    const data = await res.json();
    if (data.error) alert(data.error);
  }

  async function transferOwnership(uid: string) {
    if (!confirm("Transfer organization ownership?")) return;

    const token = await auth.currentUser?.getIdToken();

    const res = await fetch("/api/org/transfer-ownership", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    });

    const data = await res.json();
    if (data.error) alert(data.error);
  }

  async function deleteUser(uid: string, m: any) {
    if (uid === user?.uid)
      return alert("You cannot remove yourself.");
    if (m.role === "owner")
      return alert("You cannot remove the owner.");
    if (isLastAdmin(m))
      return alert("You must have at least one admin.");

    if (!confirm("Remove this user?")) return;

    const token = await auth.currentUser?.getIdToken();

    const res = await fetch("/api/org/delete-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    });

    const data = await res.json();
    if (data.error) alert(data.error);
  }

  // ----------------------
  // LOADING
  // ----------------------
  if (initializing || !planLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full" />
      </div>
    );
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

      <div className="mt-2 text-xs text-slate-500">
        Role: <strong>{role}</strong>
      </div>

      {/* MEMBER VIEW */}
      {role === "member" && (
        <div className="mt-6 p-6 rounded-xl border bg-white dark:bg-slate-800 max-w-xl">
          <h2 className="text-xl font-semibold">
            Managed by Your Organization
          </h2>

          <p className="text-slate-600 dark:text-slate-400 mt-2">
            User management is handled by your organization
            administrator.
          </p>
        </div>
      )}

      {/* BASIC PLAN */}
      {plan === "basic" && role !== "member" && (
        <div className="mt-6 p-6 rounded-xl border bg-white dark:bg-slate-800 max-w-xl">
          <h2 className="text-xl font-semibold">
            Add More Users
          </h2>

          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Your current plan only supports one user. Upgrade to
            unlock team accounts.
          </p>

          <button
            onClick={() =>
              (window.location.href =
                "/dashboard/settings#billing")
            }
            className="mt-4 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* PRO+ */}
      {plan !== "basic" && role !== "member" && (
        <>
          <div className="mt-3 text-sm">
            {memberLimit === Infinity
              ? "Unlimited members"
              : `${members.length} / ${memberLimit} seats`}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              Organization Members
            </h2>

            {(role === "owner" || role === "admin") && (
              <button
                onClick={() => !atLimit && setShowAdd(true)}
                disabled={atLimit}
                className={`px-4 py-2 rounded-lg text-white ${
                  atLimit
                    ? "bg-gray-400"
                    : "bg-sky-600 hover:bg-sky-700"
                }`}
              >
                + Add User
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {loadingMembers && <p>Loading…</p>}

            {members.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border bg-white dark:bg-slate-800 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{m.email}</div>
                  <div className="text-xs text-slate-500">
                    {m.role}
                  </div>
                </div>

                <div className="flex gap-2">
                  {role === "owner" &&
                    m.role !== "owner" && (
                      <button
                        onClick={() =>
                          transferOwnership(m.id)
                        }
                        className="px-3 py-1 bg-amber-600 text-white rounded"
                      >
                        Transfer
                      </button>
                    )}

                  {(role === "owner" || role === "admin") &&
                    m.role !== "owner" && (
                      <>
                        <button
                          disabled={isLastAdmin(m)}
                          onClick={() =>
                            updateRole(
                              m.id,
                              m.role === "admin"
                                ? "member"
                                : "admin"
                            )
                          }
                          className={`px-3 py-1 rounded text-white ${
                            isLastAdmin(m)
                              ? "bg-gray-500"
                              : "bg-purple-600 hover:bg-purple-700"
                          }`}
                        >
                          {m.role === "admin"
                            ? "Demote"
                            : "Promote"}
                        </button>

                        <button
                          disabled={isLastAdmin(m)}
                          onClick={() =>
                            deleteUser(m.id, m)
                          }
                          className={`px-3 py-1 rounded text-white ${
                            isLastAdmin(m)
                              ? "bg-gray-500"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          Remove
                        </button>
                      </>
                    )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite Modal */}
          {showAdd && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
              <form
                onSubmit={createUser}
                className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4"
              >
                <h2 className="text-lg font-semibold">
                  Invite New User
                </h2>

                <input
                  className="input"
                  placeholder="User email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <p className="text-xs text-slate-500">
                  The user will receive an invite email.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="w-1/2 border p-3 rounded"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="w-1/2 bg-sky-600 text-white p-3 rounded"
                  >
                    Send Invite
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </motion.main>
  );
}