import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import { hashPassword } from "@/lib/password";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!process.env.STRIPE_PRO_PRICE_ID) {
  throw new Error("Missing STRIPE_PRO_PRICE_ID");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, plan } = await req.json();

    if (!email || !password || !plan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔐 Hash password BEFORE storing
    const passwordHash = await hashPassword(password);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,

      metadata: {
        email,
        name: name || "",
        phone: phone || "",
        plan,
      },

      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],

      success_url: "https://getrestok.com/login",
      cancel_url: "https://getrestok.com/signup",
    });

    await db.collection("pendingSignups").doc(session.id).set({
      email,
      passwordHash,
      name: name || "",
      phone: phone || "",
      plan,
      createdAt: new Date(),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Create checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}