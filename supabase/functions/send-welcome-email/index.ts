import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const PORTAL_URL = "https://system.tennahubapps.com";

interface WelcomeEmailRequest {
  studentEmail: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  schoolName: string;
  termName?: string;
}

serve(async (req) => {
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
    const { studentEmail, studentName, admissionNumber, className, schoolName, termName } =
      (await req.json()) as WelcomeEmailRequest;

    const {
      error: sendError,
      data: emailData,
    } = await resend.emails.send({
      from: "TennaHub Student Portal <onboarding@resend.dev>",
      to: studentEmail,
      subject: `Welcome to ${schoolName}! Your Student Account Is Ready`,
      html: generateWelcomeEmail(studentName, admissionNumber, className, schoolName, termName),
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return new Response(JSON.stringify({ error: sendError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: emailData?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function generateWelcomeEmail(
  studentName: string,
  admissionNumber: string,
  className: string,
  schoolName: string,
  termName?: string
): string {
  const termGreeting = termName
    ? `Welcome to ${termName}!`
    : `Welcome to the new school year!`;
  const loginUrl = `${PORTAL_URL}/student/login`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Montserrat', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a2a3a;
      background: #f8fafc;
    }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header {
      background: linear-gradient(135deg, #005bc4 0%, #003d8a 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -1px; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 300; }
    .content { padding: 40px 30px; background: white; }
    .content p { margin: 0 0 16px 0; font-size: 15px; color: #4b5563; line-height: 1.8; }
    .student-name { color: #005bc4; font-weight: 800; }
    .info-box {
      background: #f0f4f9;
      border-left: 4px solid #005bc4;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .info-box p { margin: 4px 0; font-size: 14px; }
    .info-box strong { color: #1a2a3a; }
    .credentials-box {
      background: #fffbea;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .credentials-box p { margin: 4px 0; font-size: 14px; }
    .credentials-box code {
      background: #fef3c7;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #92400e;
    }
    .cta-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #005bc4 0%, #003d8a 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 20px 0;
    }
    .cta-container { text-align: center; }
    .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #f0f4f9;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
    .footer p { margin: 0 0 8px 0; }
    .school-badge {
      display: inline-block;
      background: #f0f4f9;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      color: #005bc4;
      font-weight: 600;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <svg viewBox="0 0 680 220" width="160" height="52" role="img" aria-label="TennaHub">
        <g transform="translate(340,110)">
          <rect x="-178" y="-52" width="7" height="80" rx="3.5" fill="white" />
          <text x="-158" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="white" textAnchor="start" letterSpacing="-1">TENNA</text>
          <text x="10" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="white" textAnchor="start" letterSpacing="-1">HUB</text>
        </g>
      </svg>
      <h1>Student Portal Access</h1>
      <p>${escapeHtml(schoolName)}</p>
    </div>

    <div class="content">
      <div class="school-badge">${escapeHtml(schoolName)}</div>

      <p>Dear <span class="student-name">${escapeHtml(studentName)}</span>,</p>

      <p>${escapeHtml(termGreeting)} We're excited to have you onboard for the upcoming academic term at ${escapeHtml(schoolName)}.</p>

      <p>Your student portal account has been created. Below are your details and login instructions:</p>

      <div class="info-box">
        <p><strong>Student Name:</strong> ${escapeHtml(studentName)}</p>
        <p><strong>Admission Number:</strong> ${escapeHtml(admissionNumber)}</p>
        <p><strong>Class:</strong> ${escapeHtml(className)}</p>
        <p><strong>School:</strong> ${escapeHtml(schoolName)}</p>
      </div>

      <p><strong>How to Login:</strong></p>

      <div class="credentials-box">
        <p><strong>Portal:</strong> <a href="${loginUrl}" style="color: #005bc4;">${escapeHtml(loginUrl)}</a></p>
        <p><strong>Username:</strong> Your Admission Number: <code>${escapeHtml(admissionNumber)}</code></p>
        <p><strong>Password:</strong> <code>alwaystry!</code> (you can change this after logging in)</p>
      </div>

      <div class="cta-container">
        <a href="${loginUrl}" class="cta-button">Access Student Portal</a>
      </div>

      <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 8px;">
        Click the button above or visit ${escapeHtml(loginUrl)} and enter your school code to login.
      </p>

      <div class="divider"></div>

      <div class="footer">
        <p><strong>Need Help?</strong></p>
        <p>Contact your school administrator if you have any questions about your account.</p>
        <p style="margin-top: 12px;">&copy; 2026 TennaHub Technologies. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
