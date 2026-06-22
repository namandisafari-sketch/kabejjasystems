import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SendStudentLoginEmailRequest {
  email: string;
  studentName: string;
  schoolName: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
      },
    });
  }

  try {
    const { email, studentName, schoolName, magicLinkUrl, expiresInMinutes = 1440 } = 
      (await req.json()) as SendStudentLoginEmailRequest;

    // Send email via Resend
    const response = await resend.emails.send({
      from: "TennaHub Student Portal <noreply@tennahubapps.com>",
      to: email,
      subject: `Your Secure Login Link - ${schoolName}`,
      html: generateEmailHTML(studentName, schoolName, magicLinkUrl, expiresInMinutes),
    });

    if (response.error) {
      return new Response(
        JSON.stringify({ error: response.error }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: response.data?.id }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function generateEmailHTML(
  studentName: string,
  schoolName: string,
  magicLinkUrl: string,
  expiresInMinutes: number
): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
      .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
      .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
      .content { padding: 40px 30px; background: white; }
      .content p { margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.6; }
      .cta-button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; }
      .cta-container { margin: 30px 0; text-align: center; }
      .link-box { margin: 12px 0 20px 0; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #6b7280; word-break: break-all; font-family: monospace; }
      .security-notice { margin: 24px 0 0 0; padding: 16px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b; }
      .security-notice p { margin: 0; font-size: 12px; color: #92400e; }
      .footer { margin: 32px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
      .footer p { margin: 0 0 8px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>TennaHub Student Portal</h1>
        <p>${escapeHtml(schoolName)}</p>
      </div>
      <div class="content">
        <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
        <p>Your secure login link is ready! Click the button below to access your student portal.</p>
        <div class="cta-container">
          <a href="${escapeHtml(magicLinkUrl)}" class="cta-button">Secure Login</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          Or copy and paste this link in your browser:
        </p>
        <div class="link-box">${escapeHtml(magicLinkUrl)}</div>
        <div class="security-notice">
          <p>
            <strong>Security Note:</strong> This link expires in ${expiresInMinutes} minutes. 
            Never share this link with anyone. TennaHub will never ask for your password via email.
          </p>
        </div>
        <div class="footer">
          <p>Questions? Contact your school administrator</p>
          <p>© 2026 TennaHub. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
