import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API = "https://api.resend.com/emails";

interface StudentWelcomeEmailRequest {
  email: string;
  studentName: string;
  schoolName: string;
  portalUrl?: string;
  subject?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: StudentWelcomeEmailRequest = await req.json();
    const { email, studentName, schoolName, portalUrl = 'https://system.tennahubapps.com/student/login', subject } = body;

    if (!email || !studentName || !schoolName) {
      return new Response(
        JSON.stringify({ error: "email, studentName, and schoolName are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate welcome email HTML
    const emailSubject = subject || `Welcome to ${schoolName} Student Portal`;
    const html = generateWelcomeEmailHTML(studentName, schoolName, email, portalUrl);

    const payload = {
      from: "TennaHub <noreply@tennahubapps.com>",
      to: [email],
      subject: emailSubject,
      html,
      reply_to: "support@tennahubapps.com",
    };

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Resend API error", detail: data }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateWelcomeEmailHTML(
  studentName: string,
  schoolName: string,
  email: string,
  portalUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .welcome-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .credentials { background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 15px 0; font-family: monospace; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${escapeHtml(schoolName)}</h1>
            <p>Student Portal Access</p>
          </div>
          
          <div class="content">
            <div class="welcome-box">
              <h2>Hello ${escapeHtml(studentName)}! 👋</h2>
              <p>Your student portal account has been created and is ready to use!</p>
            </div>

            <h3>Your Portal Login Details</h3>
            <div class="credentials">
              <strong>Email:</strong> ${escapeHtml(email)}<br>
              <strong>Portal URL:</strong> <a href="${portalUrl}">${portalUrl}</a>
            </div>

            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Click the button below to access your portal</li>
              <li>Log in with your email: <strong>${escapeHtml(email)}</strong></li>
              <li>Use the "Forgot Password" option to set your password on first login</li>
              <li>Complete your profile and review your academic information</li>
            </ol>

            <center>
              <a href="${portalUrl}" class="cta-button">Access Your Portal</a>
            </center>

            <h3>What You Can Do in the Portal:</h3>
            <ul>
              <li>View your academic performance and grades</li>
              <li>Check exam results and timetables</li>
              <li>View school announcements and events</li>
              <li>Download report cards and documents</li>
              <li>Update your personal information</li>
            </ul>

            <p><strong>Need Help?</strong></p>
            <p>If you have any issues accessing your portal or need assistance, please contact your school's administration or reply to this email.</p>

            <div class="footer">
              <p>This is an automated message. Please do not reply with sensitive information.</p>
              <p>&copy; 2026 TennaHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
