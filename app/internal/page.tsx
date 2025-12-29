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
  disabled?: boolean;
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

  const [showCreate, setShowCreate] = useState(false);
const [newEmail, setNewEmail] = useState("");
const [newPass, setNewPass] = useState("");
const [newName, setNewName] = useState("");

async function createTester(e: any) {
  e.preventDefault();

  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/internal/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: newEmail,
      password: newPass,
      name: newName,
      token,
    }),
  });

  const data = await res.json();

  if (data.error) return alert(data.error);

  alert("Tester account created!");
  window.location.reload();
}

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
  

  async function removeFromOrg(user: InternalUser) {
    if (!user.orgId) return;

    await updateDoc(doc(db, "users", user.id), {
      orgId: null,
      role: "member",
    });

    alert("User removed from org");
    window.location.reload();
  }

  async function toggleDisable(user: InternalUser, disable: boolean) {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch("/api/internal/disable-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, uid: user.id, disabled: disable }),
  });

  const data = await res.json();
  if (data.error) return alert(data.error);

  alert(disable ? "User disabled" : "User enabled");
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
        Restok Admin Panel
      </h1>

      <button
  onClick={() => setShowCreate(true)}
  className="px-4 py-2 bg-sky-600 text-white rounded-lg"
>
  + Create Test Account
</button>

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
  onClick={() => toggleDisable(u, true)}
  className="px-4 py-2 bg-red-600 text-white rounded"
>
  Disable User
</button>

{u.disabled && (
  <button
    onClick={() => toggleDisable(u, false)}
    className="px-4 py-2 bg-green-600 text-white rounded"
  >
    Enable User
  </button>
)}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
    <form
      onSubmit={createTester}
      className="bg-white p-6 rounded-xl w-full max-w-md space-y-4"
    >
      <h2 className="text-xl font-semibold">Create Tester</h2>

      <input
        className="input"
        placeholder="Name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        required
      />

      <input
        className="input"
        placeholder="Email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        required
      />

      <input
        className="input"
        placeholder="Password"
        type="password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        required
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowCreate(false)}
          className="w-1/2 border py-2 rounded"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="w-1/2 bg-sky-600 text-white py-2 rounded"
        >
          Create
        </button>
      </div>
    </form>
  </div>
)}
    </main>

    
  );
}