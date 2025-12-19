import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: Request) {
  try {
    const { email, password, orgId } = await req.json();

    if (!email || !password || !orgId) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // Create Firebase Auth user
    const userRecord = await getAuth().createUser({
      email,
      password,
    });

    // ⭐ Write Firestore user profile
    await adminDb.doc(`users/${userRecord.uid}`).set({
      email,
      orgId,
      role: "member",
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Create user failed:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}