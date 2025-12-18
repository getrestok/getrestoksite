import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db, auth as adminAuth } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

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
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ✅ PAYMENT CONFIRMED
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // 1️⃣ Load pending signup
    const pendingRef = db.collection("pendingSignups").doc(session.id);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      console.error("No pending signup for session", session.id);
      return NextResponse.json({ received: true });
    }

    const pending = pendingSnap.data()!;
    const { email, name, phone, plan } = pending;

    // 2️⃣ Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      displayName: name,
    });

    // 3️⃣ Create org
    await db.collection("organizations").doc(userRecord.uid).set({
      name: name || "My Organization",
      ownerId: userRecord.uid,
      plan,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      createdAt: Timestamp.now(),
    });

    // 4️⃣ Create user profile
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone: phone || "",
      orgId: userRecord.uid,
      role: "admin",
      createdAt: Timestamp.now(),
    });

    // 5️⃣ Generate password setup token
    const token = crypto.randomBytes(32).toString("hex");

    await db.collection("passwordSetupTokens").doc(token).set({
      uid: userRecord.uid,
      email,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(
        new Date(Date.now() + 1000 * 60 * 60 * 24)
      ),
    });

    const setupUrl = `https://getrestok.com/set-password?token=${token}`;

    // 6️⃣ Send email
    await resend.emails.send({
      from: "Restok <accounts@getrestok.com>",
      to: email,
      subject: "Set your Restok password",
      html: buildPasswordEmail(setupUrl),
    });

    // 7️⃣ Cleanup
    await pendingRef.delete();
  }

  return NextResponse.json({ received: true });
}

// 👇 Helper (keeps things clean)
function buildPasswordEmail(setupUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="background:#f1f5f9;padding:40px;font-family:Arial,sans-serif;">
  <table align="center" width="100%" style="max-width:520px;background:#fff;border-radius:14px;padding:32px;">
    <tr><td align="center">
      <img src="https://getrestok.com/logo.svg" width="48" />
      <h1>Set your password</h1>
      <p>Your Restok account has been created.</p>
      <a href="${setupUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:14px 22px;border-radius:10px;text-decoration:none;">
        Set Password
      </a>
      <p style="font-size:12px;color:#64748b;margin-top:24px;">
        This link expires in 24 hours.
      </p>
    </td></tr>
  </table>
</body>
</html>
`;
}