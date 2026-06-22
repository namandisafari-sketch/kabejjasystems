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
    const fromDomain = "onboarding@resend.dev";
    const fromName = "TennaHub Student Portal";

    const response = await resend.emails.send({
      from: `${fromName} <${fromDomain}>`,
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
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="mobile-web-app-capable" content="yes">
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
      .logo-container { margin-bottom: 20px; }
      .logo-container svg { max-width: 200px; height: auto; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -1px; }
      .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 300; }
      .content { padding: 40px 30px; background: white; }
      .content p { margin: 0 0 20px 0; font-size: 15px; color: #4b5563; line-height: 1.8; }
      .student-name { color: #005bc4; font-weight: 800; }
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
        transition: transform 0.2s;
      }
      .cta-button:hover { transform: translateY(-2px); }
      .cta-container { margin: 30px 0; text-align: center; }
      .link-box { 
        margin: 12px 0 20px 0; 
        padding: 12px; 
        background: #f0f4f9; 
        border-radius: 6px; 
        font-size: 12px; 
        color: #6b7280; 
        word-break: break-all; 
        font-family: 'Courier New', monospace; 
        border-left: 3px solid #005bc4;
      }
      .security-notice { 
        margin: 24px 0 0 0; 
        padding: 16px; 
        background: #fffbea; 
        border-radius: 6px; 
        border-left: 4px solid #f59e0b; 
      }
      .security-notice p { margin: 0; font-size: 12px; color: #92400e; }
      .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
      .footer { 
        margin: 32px 0 0 0; 
        padding-top: 20px; 
        border-top: 2px solid #f0f4f9; 
        font-size: 12px; 
        color: #9ca3af; 
        text-align: center; 
      }
      .footer p { margin: 0 0 8px 0; }
      .footer-logo { margin: 20px 0 10px 0; }
      .footer-logo svg { max-width: 100px; height: auto; opacity: 0.6; }
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
        <div class="logo-container">
          <svg viewBox="0 0 680 220" width="160" height="52" role="img" aria-label="TennaHub">
            <g transform="translate(340,110)">
              <rect x="-178" y="-52" width="7" height="80" rx="3.5" fill="white" />
              <text x="-158" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="white" textAnchor="start" letterSpacing="-1">TENNA</text>
              <text x="10" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="white" textAnchor="start" letterSpacing="-1">HUB</text>
            </g>
          </svg>
        </div>
        <h1>Student Portal</h1>
        <p>${escapeHtml(schoolName)}</p>
      </div>
      
      <div class="content">
        <div class="school-badge">${escapeHtml(schoolName)}</div>
        
        <p>Hi <span class="student-name">${escapeHtml(studentName)}</span>,</p>
        
        <p>Your secure login link is ready! Click the button below to access your student portal and view your grades, announcements, and more.</p>
        
        <div class="cta-container">
          <a href="${escapeHtml(magicLinkUrl)}" class="cta-button">Secure Login</a>
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
          Or copy and paste this link in your browser:
        </p>
        <div class="link-box">${escapeHtml(magicLinkUrl)}</div>
        
        <div class="security-notice">
          <p>
            <strong>🔒 Security Note:</strong> This link expires in ${expiresInMinutes} minutes. 
            Never share this link with anyone. TennaHub will never ask for your password via email.
          </p>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          <p><strong>Need Help?</strong></p>
          <p>Contact your school administrator if you have any questions.</p>
          <div class="footer-logo">
            <svg viewBox="0 0 680 220" width="100" height="32" role="img" aria-label="TennaHub">
              <g transform="translate(340,110)">
                <rect x="-178" y="-52" width="7" height="80" rx="3.5" fill="#005bc4" />
                <text x="-158" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="#1a2a3a" textAnchor="start" letterSpacing="-1">TENNA</text>
                <text x="10" y="8" fontFamily="'Montserrat','Inter','Helvetica Neue',Arial,sans-serif" fontWeight="800" fontSize="58" fill="#005bc4" textAnchor="start" letterSpacing="-1">HUB</text>
              </g>
            </svg>
          </div>
          <p>© 2026 TennaHub Technologies. All rights reserved.</p>
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
