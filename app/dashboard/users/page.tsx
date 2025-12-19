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

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordless, setPasswordless] = useState(false);

  // -----------------------
  // AUTH + ORG + ROLE + PLAN
  // -----------------------
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) return router.push("/login");

      setUser(u);

      onSnapshot(doc(db, "users", u.uid), (snap) => {
        const data = snap.data();
        if (!data?.orgId) return;

        setOrgId(data.orgId);
        setRole(data.role || "member");

        onSnapshot(doc(db, "organizations", data.orgId), (orgSnap) => {
          const p = orgSnap.data()?.plan;
          setPlan(p && p in PLANS ? p : "basic");
        });
      });
    });
  }, [router]);

  // -----------------------
  // SECURITY PAGE GUARD
  // -----------------------
  useEffect(() => {
    if (!role) return;
    if (role !== "owner" && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  // -----------------------
  // LOAD MEMBERS
  // -----------------------
  useEffect(() => {
    if (!orgId) return;

    return onSnapshot(
      query(collection(db, "users"), where("orgId", "==", orgId)),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      }
    );
  }, [orgId]);

  // -----------------------
  // PLAN SEAT LIMITS
  // -----------------------
  const memberLimit =
    plan === "pro" ? 5 : plan === "premium" ? Infinity : 1;

  const atLimit =
    memberLimit !== Infinity && members.length >= memberLimit;

  // -----------------------
  // COUNT ADMINS
  // -----------------------
  const adminCount = members.filter(
    (m) => m.role === "admin" || m.role === "owner"
  ).length;

  const isLastAdmin = (m: any) =>
    (m.role === "admin" || m.role === "owner") && adminCount <= 1;

  // -----------------------
  // CREATE USER / INVITE USER
  // -----------------------
  async function createUser(e: any) {
    e.preventDefault();
    if (!orgId) return;

    const currentUser = auth.currentUser;
    const token = await currentUser?.getIdToken();

    const res = await fetch(
      passwordless ? "/api/org/invite-user" : "/api/org/create-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          password,
          orgId,
        }),
      }
    );

    const data = await res.json();
    if (data.error) return alert(data.error);

    setEmail("");
    setPassword("");
    setShowAdd(false);
    setPasswordless(false);
  }

  // -----------------------
  // UPDATE ROLE
  // -----------------------
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

  // -----------------------
  // TRANSFER OWNERSHIP
  // -----------------------
  async function transferOwnership(uid: string) {
    if (!confirm("Transfer organization ownership? This cannot be undone."))
      return;

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

  // -----------------------
  // DELETE USER
  // -----------------------
  async function deleteUser(uid: string, m: any) {
    if (uid === user?.uid) return alert("You cannot remove yourself.");
    if (m.role === "owner") return alert("You cannot remove the owner.");
    if (isLastAdmin(m)) return alert("You must have at least one admin.");

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

      <div className="mt-3 text-sm">
        {memberLimit === Infinity
          ? "Unlimited members"
          : `${members.length} / ${memberLimit} seats`}
      </div>

      {/* HEADER */}
      <div className="mt-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Organization Members</h2>

        {(plan === "pro" || plan === "premium") &&
          (role === "owner" || role === "admin") && (
            <button
              onClick={() => !atLimit && setShowAdd(true)}
              disabled={atLimit}
              className={`px-4 py-2 rounded-lg text-white ${
                atLimit ? "bg-gray-400" : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              + Add User
            </button>
          )}
      </div>

      {/* MEMBERS */}
      <div className="mt-6 space-y-3">
        {loading && <p>Loading…</p>}

        {members.map((m) => (
          <div
            key={m.id}
            className="p-4 rounded-xl border flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{m.email}</div>
              <div className="text-xs text-slate-500">{m.role}</div>
            </div>

            <div className="flex gap-2">
              {/* OWNER ACTIONS */}
              {role === "owner" && m.role !== "owner" && (
                <button
                  onClick={() => transferOwnership(m.id)}
                  className="px-3 py-1 bg-amber-600 text-white rounded"
                >
                  Transfer Ownership
                </button>
              )}

              {/* ADMIN ACTIONS */}
              {(role === "owner" || role === "admin") &&
                m.role !== "owner" && (
                  <>
                    <button
                      disabled={isLastAdmin(m)}
                      onClick={() =>
                        updateRole(
                          m.id,
                          m.role === "admin" ? "member" : "admin"
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
                        : "Promote to Admin"}
                    </button>

                    <button
                      disabled={isLastAdmin(m)}
                      onClick={() => deleteUser(m.id, m)}
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

      {/* ADD USER MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={createUser}
            className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-semibold">Add New User</h2>

            <input
              className="input"
              placeholder="User email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!passwordless && (
              <input
                className="input"
                placeholder="Temporary password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}

            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={passwordless}
                onChange={() => setPasswordless(!passwordless)}
              />
              Create user without password (send setup link)
            </label>

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
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.main>
  );
}