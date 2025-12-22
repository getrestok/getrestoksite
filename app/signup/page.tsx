import { Suspense } from "react";
import SignupClient from "./SignupClient";


export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading…</div>}>
      <SignupClient />
    </Suspense>
  );
}