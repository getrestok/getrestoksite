"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { PLANS } from "@/lib/plans";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();

  // -----------------------------
  // PLAN SELECTION
  // -----------------------------
  

  const rawPlan = params.get("plan");

const selectedPlan: keyof typeof PLANS =
  rawPlan && rawPlan in PLANS ? (rawPlan as keyof typeof PLANS) : "basic";

  // -----------------------------
  // FORM STATE
  // -----------------------------
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -----------------------------
  // SIGNUP HANDLER
  // -----------------------------
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1️⃣ Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCred.user;

      // 2️⃣ Set display name
      await updateProfile(user, {
        displayName: name,
      });

      // 3️⃣ Create organization
      const orgRef = doc(db, "organizations", user.uid);

      await setDoc(orgRef, {
        name: orgName,
        ownerId: user.uid,
        plan: selectedPlan,
        status: "trial", // becomes "active" after Stripe
        createdAt: serverTimestamp(),
      });

      // 4️⃣ Create user profile
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        orgId: user.uid,
        role: "admin",
        createdAt: serverTimestamp(),
      });

      // 5️⃣ Redirect (Stripe comes next)
      router.push("/dashboard");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow relative">

        <a
          href="/"
          className="absolute top-6 left-6 text-sky-600 font-medium hover:underline"
        >
          ← Back to Home
        </a>

        <h1 className="text-3xl font-bold text-center">
          Create your account
        </h1>

        <p className="text-center text-sm text-zinc-500 mt-2">
          Plan selected:{" "}
          <span className="font-medium capitalize">
            {PLANS[selectedPlan as keyof typeof PLANS].name}
          </span>
        </p>

        {error && (
          <div className="mt-4 bg-red-100 text-red-700 p-2 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-6 space-y-4">

            {/* PLAN */}
<div>
  <label className="block text-sm font-medium text-zinc-700">
    Plan
  </label>
  <select
    value={selectedPlan}
    disabled
    className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
  >
    <option value="basic">Basic — 15 items</option>
    <option value="pro">Pro — Unlimited items</option>
    <option value="premium">Premium — Unlimited + multi-location</option>
  </select>
</div>

          {/* FULL NAME */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
              placeholder="Your full name"
            />
          </div>

          {/* ORGANIZATION NAME */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
              placeholder="Your company or organization"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
              placeholder="you@business.com"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500"
              placeholder="Minimum 6 characters"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white py-3 rounded-lg font-medium hover:bg-sky-700 disabled:bg-sky-400"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-sky-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}