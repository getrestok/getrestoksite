import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = getFirestore();

export async function POST(req: Request) {
  try {
    const authUser = (await admin.auth().verifyIdToken(
      (await req.json()).token
    ));

    // Must be logged in & internal admin
    const userDoc = await db.collection("users").doc(authUser.uid).get();

    if (!userDoc.exists || userDoc.data()?.internalAdmin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email, password, name } = await req.json();

    // Create Firebase Auth account
    const user = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create org
    const orgRef = db.collection("organizations").doc();
    await orgRef.set({
      id: orgRef.id,
      ownerId: user.uid,
      name: `${name}'s Organization`,
      plan: "basic",
      beta: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create user Firestore doc
    await db.collection("users").doc(user.uid).set({
      email,
      name,
      orgId: orgRef.id,
      role: "owner",
      internalAdmin: false,
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      orgId: orgRef.id,
    });

  } catch (err: any) {
    console.log(err);
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
}