import { NextResponse } from "next/server";
import { auth } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const tokenRef = db.collection("passwordSetupTokens").doc(token);
  const snap = await tokenRef.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const data = snap.data()!;
  if (data.expiresAt.toDate() < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  // Set Firebase password
  await auth.updateUser(data.uid, { password });

  // Cleanup token
  await tokenRef.delete();

  return NextResponse.json({ success: true });
}