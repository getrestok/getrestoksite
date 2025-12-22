import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("ME API START");

    // 1️⃣ Try header token first
    const hdrs = headers();
    const authHeader = (await hdrs).get("authorization");

    let idToken: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      idToken = authHeader.split("Bearer ")[1];
      console.log("Using Authorization header token");
    } else {
      // 2️⃣ fallback → cookie token
      const cookieStore = cookies();
      idToken = (await cookieStore).get("__session")?.value;
      console.log("Using __session cookie token");
    }

    if (!idToken) {
      console.log("NO TOKEN");
      return NextResponse.json(
        { error: "Not logged in" },
        { status: 401 }
      );
    }

    console.log("VERIFYING TOKEN…");
    const decoded = await adminAuth.verifyIdToken(idToken);
    console.log("TOKEN OK", decoded.uid);

    const userSnap = await getDoc(doc(db, "users", decoded.uid));
    const user = userSnap.data();

    if (!user)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );

    let orgData = null;

    if (user.orgId) {
      const orgSnap = await getDoc(
        doc(db, "organizations", user.orgId)
      );
      orgData = orgSnap.data();
    }

    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email,
      name: user.name || decoded.name || "User",
      orgId: user.orgId || null,
      orgName: orgData?.name || "No Organization",
      plan: orgData?.plan || "basic",
    });
  } catch (err) {
    console.error("ME API ERROR", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}