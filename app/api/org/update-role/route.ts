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

    const { uid, role } = await req.json();

    if (!uid || !role)
      return NextResponse.json(
        { error: "Missing uid or role" },
        { status: 400 }
      );

    if (!["admin", "member"].includes(role))
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );

    // ---------------------------
    // LOAD CALLER
    // ---------------------------
    const callerSnap = await adminDb.collection("users").doc(callerUid).get();
    if (!callerSnap.exists)
      return NextResponse.json({ error: "Caller not found" }, { status: 404 });

    const caller = callerSnap.data()!;
    const orgId = caller.orgId;

    if (!orgId)
      return NextResponse.json({ error: "No organization" }, { status: 400 });

    if (!(caller.role === "owner" || caller.role === "admin"))
      return NextResponse.json(
        { error: "You are not allowed to manage roles" },
        { status: 403 }
      );

    // ---------------------------
    // LOAD TARGET
    // ---------------------------
    const targetRef = adminDb.collection("users").doc(uid);
    const targetSnap = await targetRef.get();

    if (!targetSnap.exists)
      return NextResponse.json(
        { error: "User does not exist" },
        { status: 404 }
      );

    const target = targetSnap.data()!;

    if (target.orgId !== orgId)
      return NextResponse.json(
        { error: "User not in your organization" },
        { status: 403 }
      );

    if (target.role === "owner")
      return NextResponse.json(
        { error: "You cannot modify the owner" },
        { status: 403 }
      );

    // ---------------------------
    // PREVENT REMOVING LAST ADMIN
    // ---------------------------
    if (role === "member") {
      const adminsSnap = await adminDb
        .collection("users")
        .where("orgId", "==", orgId)
        .where("role", "in", ["admin", "owner"])
        .get();

      if (adminsSnap.size <= 1) {
        return NextResponse.json(
          { error: "Organization must have at least one admin" },
          { status: 400 }
        );
      }
    }

    // ---------------------------
    // UPDATE USER
    // ---------------------------
    await targetRef.update({
      role,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("UPDATE ROLE ERROR", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}