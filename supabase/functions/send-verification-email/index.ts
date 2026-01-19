import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  email: string;
  username: string;
  verificationUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, username, verificationUrl }: EmailRequest = await req.json();

    console.log(`Sending verification email to ${email}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1410; color: #f5f0e8; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #2d2318 0%, #1a1410 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d2e1f; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #d4a574; font-size: 32px; margin: 0; }
          h2 { color: #f5f0e8; font-size: 24px; margin-bottom: 20px; }
          p { color: #a8a29e; line-height: 1.6; margin-bottom: 20px; }
          .button { display: inline-block; background: linear-gradient(135deg, #d4a574 0%, #b8956a 100%); color: #1a1410; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #3d2e1f; }
          .footer p { font-size: 12px; color: #78716c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>⚔️ War Room</h1>
          </div>
          <h2>Welcome, ${username}!</h2>
          <p>Thank you for joining the War Room. To complete your registration and gain full access to the platform, please verify your email address.</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>If you didn't create an account with War Room, you can safely ignore this email.</p>
          <div class="footer">
            <p>This verification link will expire in 24 hours.</p>
            <p>&copy; ${new Date().getFullYear()} War Room. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "War Room <onboarding@resend.dev>",
        to: [email],
        subject: "Verify your War Room account",
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
