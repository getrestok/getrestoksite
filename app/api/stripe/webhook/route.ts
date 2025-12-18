import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db, auth } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ✅ PAYMENT COMPLETED
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const pendingRef = db.collection("pendingSignups").doc(session.id);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      console.warn("No pending signup found for session:", session.id);
      return NextResponse.json({ received: true });
    }

    const pending = pendingSnap.data()!;
    const { email, passwordHash, name, phone, plan } = pending;

    try {
      // 🔐 Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password: pending.password, // IMPORTANT: password already hashed
        displayName: name,
      });

      // 🏢 Create organization
      const orgRef = db.collection("organizations").doc(userRecord.uid);
      await orgRef.set({
        name: `${name}'s Organization`,
        ownerId: userRecord.uid,
        plan,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        createdAt: Timestamp.now(),
        planUpdatedAt: Timestamp.now(),
      });

      // 👤 Create user profile
      await db.collection("users").doc(userRecord.uid).set({
        name,
        email,
        phone: phone || null,
        orgId: userRecord.uid,
        role: "admin",
        createdAt: Timestamp.now(),
      });

      // 🧹 Cleanup
      await pendingRef.delete();

      console.log("✅ User created successfully:", email);
    } catch (err) {
      console.error("❌ Failed to create Firebase user:", err);
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}