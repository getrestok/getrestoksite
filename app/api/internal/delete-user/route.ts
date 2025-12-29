import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = getFirestore();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, uid } = body;

    // Verify caller
    const authUser = await admin.auth().verifyIdToken(token);
    const callerDoc = await db.collection("users").doc(authUser.uid).get();

    if (!callerDoc.exists || callerDoc.data()?.internalAdmin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get user to see if org cleanup is needed
    const userDoc = await db.collection("users").doc(uid).get();
    const orgId = userDoc.data()?.orgId;

    // Delete user doc
    await db.collection("users").doc(uid).delete();

    // Optionally delete org if they are owner
    if (orgId) {
      const org = await db.collection("organizations").doc(orgId).get();
      if (org.exists && org.data()?.ownerId === uid) {
        await db.collection("organizations").doc(orgId).delete();
      }
    }

    // Delete Firebase Auth user
    await admin.auth().deleteUser(uid);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.log(err);
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
}