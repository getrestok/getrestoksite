import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, email, password, name } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Verify requester
    const decoded = await admin.auth().verifyIdToken(token);
    const adminUid = decoded.uid;

    const adminDoc = await db.collection("users").doc(adminUid).get();

    if (!adminDoc.exists || adminDoc.data()?.internalAdmin !== true) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create Firebase Auth user
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

    // Create user firestore doc
    await db.collection("users").doc(user.uid).set({
      email,
      name,
      orgId: orgRef.id,
      role: "owner",
      internalAdmin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      orgId: orgRef.id,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 }
    );
  }
}