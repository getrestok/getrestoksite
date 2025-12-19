import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("__session")?.value;

    if (!token)
      return NextResponse.json(
        { error: "Not logged in" },
        { status: 401 }
      );

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userSnap = await getDoc(doc(db, "users", uid));
    const user = userSnap.data();

    if (!user)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );

    let org = null;
    if (user.orgId) {
      const orgSnap = await getDoc(
        doc(db, "organizations", user.orgId)
      );
      org = orgSnap.data();
    }

    return NextResponse.json({
      uid,
      email: decoded.email,
      name: user.name || decoded.name || "User",
      orgId: user.orgId || null,
      orgName: org?.name || "No Organization",
      plan: org?.plan || "basic",
    });
  } catch (err) {
    console.error("ME API ERROR", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}