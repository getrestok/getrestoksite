import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const requesterUid = decoded.uid;

    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "Missing user id" },
        { status: 400 }
      );
    }

    if (uid === requesterUid) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    // Get user being deleted
    const userSnap = await adminDb.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userSnap.data();
    const orgId = user?.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "User does not belong to an organization" },
        { status: 400 }
      );
    }

    // Get requester (security)
    const requesterSnap = await adminDb.doc(`users/${requesterUid}`).get();
    const requester = requesterSnap.data();

    if (!requester || requester.orgId !== orgId) {
      return NextResponse.json(
        { error: "You do not belong to this organization" },
        { status: 403 }
      );
    }

    if (requester.role !== "owner" && requester.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can remove users" },
        { status: 403 }
      );
    }

    // Get org
    const orgSnap = await adminDb.doc(`organizations/${orgId}`).get();
    if (!orgSnap.exists) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const org = orgSnap.data();

    if (!org) {
      return NextResponse.json(
        { error: "Organization data missing" },
        { status: 500 }
      );
    }

    // Cannot delete owner
    if (user.role === "owner" || org.ownerId === uid) {
      return NextResponse.json(
        { error: "You cannot remove the owner" },
        { status: 400 }
      );
    }

    // Ensure at least ONE admin remains
    const membersSnap = await adminDb
      .collection("users")
      .where("orgId", "==", orgId)
      .get();

    const admins = membersSnap.docs.filter((d) => {
      const r = d.data().role;
      return r === "admin" || r === "owner";
    });

    if (admins.length <= 1 && (user.role === "admin" || user.role === "owner")) {
      return NextResponse.json(
        { error: "Organization must have at least one admin" },
        { status: 400 }
      );
    }

    // 🔥 DELETE USER FIRESTORE PROFILE
    await userSnap.ref.delete();

    // 🔥 DELETE AUTH ACCOUNT
    await adminAuth.deleteUser(uid);

    // Optional audit log
    await adminDb.collection("auditLogs").add({
      type: "user_deleted",
      removedUser: uid,
      removedBy: requesterUid,
      orgId,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete user failed:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}