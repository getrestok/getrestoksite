import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_KEY);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    await resend.emails.send({
      from: "Restok Contact <support@getrestok.com>",
      to: "support@getrestok.com",
      subject: `Contact: ${data.topic}`,
      text: `
Name: ${data.name}
Email: ${data.email}
Business: ${data.business || "N/A"}

Message:
${data.message}
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: true }, { status: 500 });
  }
}