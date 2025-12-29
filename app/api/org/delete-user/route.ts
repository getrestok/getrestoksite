import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer "))
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 401 }
      );

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const callerUid = decoded.uid;

    const { uid } = await req.json();
    if (!uid)
      return NextResponse.json(
        { error: "Missing uid" },
        { status: 400 }
      );

    // 🚫 Block deleting yourself
    if (uid === callerUid)
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization." },
        { status: 400 }
      );

    // -------------------------
    // CALLER
    // -------------------------
    const callerSnap = await adminDb.collection("users").doc(callerUid).get();
    if (!callerSnap.exists)
      return NextResponse.json(
        { error: "Caller not found" },
        { status: 404 }
      );

    const caller = callerSnap.data()!;
    const orgId = caller.orgId;

    if (!orgId)
      return NextResponse.json(
        { error: "You are not in an organization" },
        { status: 400 }
      );

    if (!(caller.role === "owner" || caller.role === "admin"))
      return NextResponse.json(
        { error: "You are not allowed to delete users" },
        { status: 403 }
      );

    // -------------------------
    // ORG (authoritative owner)
    // -------------------------
    const orgSnap = await adminDb.collection("organizations").doc(orgId).get();
    if (!orgSnap.exists)
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );

    const org = orgSnap.data()!;
    const ownerId = org.ownerId;

    // -------------------------
    // TARGET USER
    // -------------------------
    const targetRef = adminDb.collection("users").doc(uid);
    const targetSnap = await targetRef.get();

    if (!targetSnap.exists)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );

    const target = targetSnap.data()!;

    if (target.orgId !== orgId)
      return NextResponse.json(
        { error: "User is not in your organization" },
        { status: 403 }
      );

    // 🚫 Owner cannot be deleted
    if (uid === ownerId)
      return NextResponse.json(
        { error: "You cannot remove the organization owner" },
        { status: 403 }
      );

    // 🚫 Prevent deleting last admin
    if (target.role === "admin" || target.role === "owner") {
      const adminsSnap = await adminDb
        .collection("users")
        .where("orgId", "==", orgId)
        .where("role", "in", ["admin", "owner"])
        .get();

      if (adminsSnap.size <= 1)
        return NextResponse.json(
          { error: "Organization must have at least one admin" },
          { status: 400 }
        );
    }

    // 1️⃣ Soft remove from org first
    await targetRef.update({
      orgId: null,
      role: "member",
      removedAt: new Date(),
      deleted_user: true,
    });

    // 2️⃣ Delete Firebase Auth account
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE USER ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}