import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/firebaseAdmin";
import { hashPassword } from "@/lib/password";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // 🔐 Hash password BEFORE storing
  const passwordHash = await hashPassword(password);

  // Create Stripe Checkout
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: "https://getrestok.com/login",
    cancel_url: "https://getrestok.com/signup",
  });

  // 🕒 Store signup temporarily
  await db.collection("pendingSignups").doc(session.id).set({
    email,
    passwordHash,
    name: name || "",
    createdAt: new Date(),
  });

  return NextResponse.json({ url: session.url });
}