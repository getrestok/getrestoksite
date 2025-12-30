import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const SIGNING_SECRET = process.env.RESEND_EMAIL_FORWARD_WEBHOOK_SECRET!;

function verifySignature(rawBody: string, signature: string) {
  const digest = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("resend-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Safe to parse now
  const event = JSON.parse(rawBody);

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const email = event.data;

  await resend.emails.send({
    from: "Restok Support <support@getrestok.com>",
    to: "braden@issioffice.com",
    subject: `FWD: ${email.subject || "No subject"}`,
    html: email.html || `<pre>${email.text || ""}</pre>`,
    replyTo: email.from,
  });

  return NextResponse.json({ ok: true });
}