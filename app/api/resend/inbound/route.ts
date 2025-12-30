import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

function verifyResendSignature(rawBody: string, signature: string, timestamp: string) {
  const secret = process.env.RESEND_WEBHOOK_SECRET!;
  const data = `${timestamp}.${rawBody}`;

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("resend-signature") ?? "";
  const timestamp = req.headers.get("resend-timestamp") ?? "";

  // Reject replay attacks (>5 min old)
  const FIVE_MIN = 5 * 60 * 1000;
  if (Date.now() - Number(timestamp) > FIVE_MIN) {
    return NextResponse.json({ error: "Stale request" }, { status: 400 });
  }

  // Verify signature
  const valid = verifyResendSignature(rawBody, signature, timestamp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // SAFE TO PARSE NOW
  const event = JSON.parse(rawBody);

  const { from, to, subject, text, html } = event;

  // Forward email
  await resend.emails.send({
    from: "Restok Support <support@getrestok.com>",
    to: "braden@issioffice.com",
    subject: `FWD: ${subject || "No subject"}`,
    html: html || `<pre>${text || ""}</pre>`,
    replyTo: from
  });

  return NextResponse.json({ success: true });
}