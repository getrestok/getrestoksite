import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const email = await resend.emails.send({
      from: "StockPilot <noreply@yourdomain.com>",
      to,
      subject,
      html: `
        <div style="font-family: Arial; padding: 16px;">
          <h2 style="color: #0ea5e9;">${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, email });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Email send failed." },
      { status: 500 }
    );
  }
}
