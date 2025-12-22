import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists())
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = userSnap.data();
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
  } catch (err: any) {
    console.error("ME API ERROR", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}