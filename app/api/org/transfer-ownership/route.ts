import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid)
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });

    // Load target user
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    if (!userSnap.exists)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const user = userSnap.data();
    const orgId = user?.orgId;
    if (!orgId)
      return NextResponse.json({ error: "User missing org" }, { status: 400 });

    // Load org
    const orgRef = adminDb.doc(`organizations/${orgId}`);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists)
      return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const org = orgSnap.data();
    if (!org)
      return NextResponse.json({ error: "Org invalid" }, { status: 500 });

    // Prevent transferring to same owner
    if (org.ownerId === uid) {
      return NextResponse.json(
        { error: "User is already the owner" },
        { status: 400 }
      );
    }

    // Make previous owner admin
    await adminDb.doc(`users/${org.ownerId}`).update({
      role: "admin",
    });

    // Promote new owner
    await userSnap.ref.update({
      role: "owner",
    });

    // Update org record
    await orgRef.update({
      ownerId: uid,
    });

    // Audit log
    await adminDb.collection("auditLogs").add({
      type: "ownership_transfer",
      from: org.ownerId,
      to: uid,
      orgId,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("transfer-ownership error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}