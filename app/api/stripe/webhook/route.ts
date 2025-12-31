import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

// -------------------------
// PLAN NORMALIZER
// -------------------------
function normalizePlan(value: any): "basic" | "pro" | "premium" | "enterprise" {
  const v = String(value || "").toLowerCase();

  if (v.includes("enterprise")) return "enterprise";
  if (v.includes("premium")) return "premium";
  if (v.includes("pro")) return "pro";
  return "basic";
}

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
    console.error("❌ Webhook verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("🔔 Stripe event received:", event.type);

  // =========================================================================
  // CHECKOUT COMPLETED → CREATE USER + ORG
  // =========================================================================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const pendingRef = adminDb.collection("pendingSignups").doc(session.id);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      console.warn("⚠️ No pending signup for session", session.id);
      return NextResponse.json({ received: true });
    }

    const pending = pendingSnap.data()!;
    const { email, name, phone, plan } = pending;

    const existingUser = await adminAuth
      .getUserByEmail(email)
      .catch(() => null);

    if (existingUser) {
      console.log("ℹ️ User already exists:", email);
      return NextResponse.json({ received: true });
    }

    const normalizedPlan = normalizePlan(plan);

    const userRecord = await adminAuth.createUser({
      email,
      displayName: name,
    });

    const orgId = userRecord.uid;

    await adminDb.collection("organizations").doc(orgId).set({
      name: name || "My Organization",
      ownerId: orgId,
      orgId,
      plan: normalizedPlan,
      active: true,
      stripeCustomerId: session.customer ?? null,
      stripeSubscriptionId: session.subscription ?? null,
      createdAt: Timestamp.now(),
    });

    await adminDb.collection("users").doc(orgId).set({
      name,
      email,
      phone: phone || "",
      orgId,
      role: "admin",
      createdAt: Timestamp.now(),
    });

    const token = crypto.randomBytes(32).toString("hex");

    await adminDb.collection("passwordSetupTokens").doc(token).set({
      uid: orgId,
      email,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(
        new Date(Date.now() + 1000 * 60 * 60 * 24)
      ),
    });

    const setupUrl = `https://getrestok.com/set-password?token=${token}`;

    await resend.emails.send({
      from: "Restok <accounts@getrestok.com>",
      to: email,
      subject: "Set your Restok password",
      html: buildPasswordEmail(setupUrl),
    });

    await pendingRef.delete();
  }

  // =========================================================================
  // SUBSCRIPTION UPDATED → KEEP PLAN & ACTIVE STATUS IN SYNC
  // =========================================================================
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;

    const nickname =
      sub.items.data[0].price.nickname ||
      sub.items.data[0].price.product ||
      "";

    const cleanPlan = normalizePlan(nickname);
    const customerId = sub.customer as string;

    const orgSnap = await adminDb
      .collection("organizations")
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();

    if (!orgSnap.empty) {
      await orgSnap.docs[0].ref.update({
        plan: cleanPlan,
        active: true,
        stripeSubscriptionId: sub.id,
      });

      console.log("✅ Subscription updated → plan:", cleanPlan);
    }
  }

  // =========================================================================
  // SUBSCRIPTION CANCELED → DEACTIVATE ACCOUNT
  // =========================================================================
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const orgSnap = await adminDb
      .collection("organizations")
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();

    if (!orgSnap.empty) {
      await orgSnap.docs[0].ref.update({
        active: false,
        canceledAt: Timestamp.now(),
        stripeSubscriptionId: null,
      });

      console.log("❌ Subscription canceled — org deactivated");
    } else {
      console.warn("⚠️ No org found for canceled subscription");
    }
  }

  return NextResponse.json({ received: true });
}

// =================================================================
// EMAIL TEMPLATE
// =================================================================
function buildPasswordEmail(setupUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="background:#f1f5f9;padding:40px;font-family:Arial,sans-serif;">
  <table align="center" width="100%" style="max-width:520px;background:#fff;border-radius:14px;padding:32px;">
    <tr><td align="center">
      <img src="https://getrestok.com/logo.png" width="48" />
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