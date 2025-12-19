import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// CHANGE THESE
const SUPPORT_TO = "support@getrestok.com";
const BCC = ["cory@issioffice.com", "braden@issioffice.com", "issichatt@gmail.com"];

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    const metadata = JSON.parse(form.get("metadata") as string);
    const subject = form.get("subject") as string;
    const message = form.get("message") as string;

    const file = form.get("file") as File | null;

    let attachments: any[] = [];

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      attachments.push({
        filename: file.name,
        content: buffer.toString("base64"),
      });
    }

    const html = `
      <h2>New Support Request</h2>

      <p><strong>Subject:</strong> ${subject}</p>
      <p>${message.replace(/\n/g, "<br>")}</p>

      <hr>

      <h3>User Info</h3>
      <p><strong>Name:</strong> ${metadata?.name}</p>
      <p><strong>Email:</strong> ${metadata?.email}</p>
      <p><strong>Org:</strong> ${metadata?.orgName}</p>
      <p><strong>Plan:</strong> ${metadata?.plan}</p>
      <p><strong>UID:</strong> ${metadata?.uid}</p>
    `;

    await resend.emails.send({
      from: "Restok Support <support@yourdomain.com>",
      to: SUPPORT_TO,
      bcc: BCC,
      subject: `Support — ${subject}`,
      html,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SUPPORT API ERROR", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}