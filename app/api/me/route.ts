import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
const token = cookieStore.get("__session")?.value;

    if (!token)
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userSnap = await adminDb.collection("users").doc(uid).get();
    const user = userSnap.data();

    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    let orgData = null;

    if (user.orgId) {
      const orgSnap = await adminDb
        .collection("organizations")
        .doc(user.orgId)
        .get();

      orgData = orgSnap.data();
    }

    return NextResponse.json({
      uid,
      email: decoded.email,
      name: user.name || decoded.name || "User",
      orgId: user.orgId || null,
      orgName: orgData?.name || null,
      plan: orgData?.plan || "basic",
    });
  } catch (err) {
    console.error("ME API ERROR", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}