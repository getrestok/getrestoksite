import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase-admin/auth";
import { headers, cookies } from "next/headers";

export const runtime = "nodejs"; // IMPORTANT for Firebase Admin

export async function GET() {
  try {
    let idToken: string | undefined;

    // 1️⃣ Headers (await required now)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      idToken = authHeader.replace("Bearer ", "");
    }

    // 2️⃣ Cookie fallback
    if (!idToken) {
      const cookieStore = await cookies();
      const cookie = cookieStore.get("__session");
      idToken = cookie?.value;
    }

    if (!idToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify Firebase token
    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Load Firestore user
    const userSnap = await getDoc(doc(db, "users", uid));
    const user = userSnap.data();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Load org if exists
    let orgData: any = null;
    if (user.orgId) {
      const orgSnap = await getDoc(
        doc(db, "organizations", user.orgId)
      );
      orgData = orgSnap.data();
    }

    return NextResponse.json({
      uid,
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