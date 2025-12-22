import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}