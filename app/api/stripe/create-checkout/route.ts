import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json(
        { error: "Stripe price not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { email, name, phone, plan } = await req.json();

    if (!email || !plan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const priceMap: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};

const price = priceMap[plan];

if (!price) {
  return NextResponse.json(
    { error: "Invalid plan selected" },
    { status: 400 }
  );
}

    // ✅ Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer_email: email,

  metadata: {
    plan: plan.toLowerCase(),   // normalize 👌
    email,
    name: name || "",
    phone: phone || "",
  },

  line_items: [
    {
      price,
      quantity: 1,
    },
  ],

  success_url: "https://getrestok.com/login?setup=1",
  cancel_url: "https://getrestok.com/signup",
});

    // ✅ Store TEMP signup data (NO PASSWORD)
    await adminDb.collection("pendingSignups").doc(session.id).set({
      email,
      name: name || "",
      phone: phone || "",
      plan,
      createdAt: new Date(),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Create checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}