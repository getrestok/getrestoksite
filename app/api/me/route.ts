import { NextResponse } from "next/server";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get("__session")?.value;

    if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userSnap = await getDoc(doc(db, "users", uid));
    const user = userSnap.data();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let orgData = null;

    if (user.orgId) {
      const orgSnap = await getDoc(doc(db, "organizations", user.orgId));
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