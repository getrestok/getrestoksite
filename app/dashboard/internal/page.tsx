"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

type InternalUser = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  orgId?: string | null;
  role?: string;
  plan?: string;
};

const PLANS = ["basic", "pro", "premium", "enterprise"];

export default function InternalPanel() {
  const router = useRouter();

  const [users, setUsers] = useState<InternalUser[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // -----------------------------------
  // AUTH CHECK — MUST BE INTERNAL
  // -----------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/internal/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const data: any = snap.data();

      if (!data?.internalAdmin) {
        router.replace("/dashboard");
        return;
      }

      setAuthReady(true);
    });

    return () => unsub();
  }, [router]);

  // -----------------------------------
  // LOAD DATA AFTER AUTH ONLY
  // -----------------------------------
  useEffect(() => {
    if (!authReady) return;

    async function load() {
      const snap = await getDocs(collection(db, "users"));

      const raw = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const usersWithPlan: InternalUser[] = [];

      for (const u of raw) {
        let plan = "none";

        if (u.orgId) {
          const orgSnap = await getDoc(
            doc(db, "organizations", u.orgId)
          );
          plan = orgSnap.data()?.plan || "basic";
        }

        usersWithPlan.push({
          id: u.id,
          email: u.email,
          name: u.name || u.displayName || "Unknown",
          phone: u.phone || "",
          orgId: u.orgId || null,
          role: u.role || "member",
          plan,
        });
      }

      setUsers(usersWithPlan);
      setLoadingData(false);
    }

    load();
  }, [authReady]);

  // -----------------------------------
  // ACTIONS
  // -----------------------------------
  async function changePlan(user: InternalUser, newPlan: string) {
    if (!user.orgId) return alert("User has no org");

    await updateDoc(doc(db, "organizations", user.orgId), {
      plan: newPlan,
    });

    alert("Plan updated!");
    window.location.reload();
  }

  async function removeFromOrg(user: InternalUser) {
    if (!user.orgId) return;

    await updateDoc(doc(db, "users", user.id), {
      orgId: null,
      role: "member",
    });

    alert("User removed from org");
    window.location.reload();
  }

  async function deleteUserAccount(user: InternalUser) {
    if (!confirm("Delete this user completely?")) return;

    await deleteDoc(doc(db, "users", user.id));

    alert(
      "User deleted. (Firebase Auth account must still be removed manually in Console)"
    );
    window.location.reload();
  }

  // -----------------------------------
  // LOADING UI
  // -----------------------------------
  if (!authReady || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-sky-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // -----------------------------------
  // MAIN UI
  // -----------------------------------
  return (
    <main className="p-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">
        Restok Internal Admin Panel
      </h1>

      <p className="text-slate-500 mt-2">
        Private admin dashboard — NOT visible to users.
      </p>

      <div className="mt-8 space-y-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="p-5 border rounded-xl bg-white shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {u.name}
                </div>
                <div className="text-sm text-slate-500">
                  {u.email}
                </div>

                {u.phone && (
                  <div className="text-sm text-slate-500">
                    📞 {u.phone}
                  </div>
                )}

                <div className="text-xs mt-2 text-slate-400">
                  UID: {u.id}
                </div>
                <div className="text-xs text-slate-400">
                  Org: {u.orgId || "None"}
                </div>
                <div className="text-xs text-slate-400">
                  Role: {u.role}
                </div>
              </div>

              <div>
                <div className="text-sm">
                  Plan:{" "}
                  <span className="font-semibold">
                    {u.plan}
                  </span>
                </div>

                {u.orgId && (
                  <select
                    className="mt-2 border rounded px-2 py-1"
                    defaultValue={u.plan}
                    onChange={(e) =>
                      changePlan(u, e.target.value)
                    }
                  >
                    {PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {u.orgId && (
                <button
                  onClick={() => removeFromOrg(u)}
                  className="px-4 py-2 bg-amber-500 text-white rounded"
                >
                  Remove From Org
                </button>
              )}

              <button
                onClick={() => deleteUserAccount(u)}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete User
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}