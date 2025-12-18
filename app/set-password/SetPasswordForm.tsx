"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Invalid or missing token");

      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to set password");
      }

      router.push("/login?setup=1");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow max-w-md w-full"
      >
        <h1 className="text-2xl font-bold text-center">
          Set your password
        </h1>

        <p className="text-sm text-slate-500 text-center mt-2">
          Finish setting up your Restok account
        </p>

        {error && (
          <div className="mt-4 text-sm bg-red-100 text-red-700 p-2 rounded">
            {error}
          </div>
        )}

        <input
          type="password"
          required
          minLength={6}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full border rounded-lg px-3 py-2"
        />

        <button
          disabled={loading}
          className="mt-4 w-full bg-sky-600 text-white py-3 rounded-lg"
        >
          {loading ? "Saving..." : "Set Password"}
        </button>
      </form>
    </div>
  );
}