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

    // Create auth user
    const userRecord = await getAuth().createUser({
      email,
      password,
    });

    // Store Firestore user doc
    await adminDb
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email,
        orgId,
        role: "member",
        createdAt: Date.now(),
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}