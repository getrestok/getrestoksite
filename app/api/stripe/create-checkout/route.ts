import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import { hashPassword } from "@/lib/password";

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

    const { email, password, name, phone, plan } = await req.json();

    if (!email || !password || !plan) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const encryptedPassword = password; // temporary only

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
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],

      success_url: "https://getrestok.com/login",
      cancel_url: "https://getrestok.com/signup",
    });

    await db.collection("pendingSignups").doc(session.id).set({
      email,
      password: encryptedPassword,
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