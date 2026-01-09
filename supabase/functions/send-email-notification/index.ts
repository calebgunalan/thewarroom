import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "task_reminder" | "meeting_reminder" | "task_assigned" | "meeting_scheduled";
  recipient_email: string;
  recipient_name: string;
  subject: string;
  data: {
    title?: string;
    deadline?: string;
    meeting_time?: string;
    assigned_by?: string;
    description?: string;
  };
}

const getEmailTemplate = (type: string, data: EmailRequest["data"], recipientName: string): string => {
  const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: linear-gradient(135deg, #2d1810 0%, #3d2418 100%);
    border-radius: 12px;
    overflow: hidden;
  `;

  const headerStyle = `
    background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
    padding: 30px;
    text-align: center;
  `;

  const contentStyle = `
    padding: 30px;
    color: #f5e6d3;
  `;

  switch (type) {
    case "task_reminder":
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #f5e6d3; margin: 0; font-size: 24px;">⏰ Task Deadline Reminder</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>This is a reminder that your task is due soon:</p>
            <div style="background: rgba(139, 69, 19, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #d4a574; margin: 0 0 10px 0;">${data.title}</h2>
              <p style="margin: 0; color: #ffd700;"><strong>Deadline:</strong> ${data.deadline}</p>
              ${data.description ? `<p style="margin: 10px 0 0 0;">${data.description}</p>` : ""}
            </div>
            <p>Please ensure you complete this task on time to avoid strikes.</p>
            <a href="${Deno.env.get("SITE_URL") || "https://lovable.dev"}/tasks" style="display: inline-block; background: #8b4513; color: #f5e6d3; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Task</a>
          </div>
        </div>
      `;

    case "meeting_reminder":
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #f5e6d3; margin: 0; font-size: 24px;">📅 Meeting Starting Soon</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>You have a meeting starting soon:</p>
            <div style="background: rgba(139, 69, 19, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #d4a574; margin: 0 0 10px 0;">${data.title}</h2>
              <p style="margin: 0; color: #ffd700;"><strong>Time:</strong> ${data.meeting_time}</p>
            </div>
            <p>Don't miss it! Click below to join.</p>
            <a href="${Deno.env.get("SITE_URL") || "https://lovable.dev"}/meeting" style="display: inline-block; background: #8b4513; color: #f5e6d3; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">Join Meeting</a>
          </div>
        </div>
      `;

    case "task_assigned":
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #f5e6d3; margin: 0; font-size: 24px;">📋 New Task Assigned</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>You have been assigned a new task:</p>
            <div style="background: rgba(139, 69, 19, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #d4a574; margin: 0 0 10px 0;">${data.title}</h2>
              <p style="margin: 0; color: #ffd700;"><strong>Deadline:</strong> ${data.deadline}</p>
              ${data.assigned_by ? `<p style="margin: 5px 0 0 0;"><strong>Assigned by:</strong> ${data.assigned_by}</p>` : ""}
              ${data.description ? `<p style="margin: 10px 0 0 0;">${data.description}</p>` : ""}
            </div>
            <a href="${Deno.env.get("SITE_URL") || "https://lovable.dev"}/tasks" style="display: inline-block; background: #8b4513; color: #f5e6d3; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Tasks</a>
          </div>
        </div>
      `;

    case "meeting_scheduled":
      return `
        <div style="${baseStyle}">
          <div style="${headerStyle}">
            <h1 style="color: #f5e6d3; margin: 0; font-size: 24px;">🎥 New Meeting Scheduled</h1>
          </div>
          <div style="${contentStyle}">
            <p>Hello <strong>${recipientName}</strong>,</p>
            <p>A new meeting has been scheduled:</p>
            <div style="background: rgba(139, 69, 19, 0.3); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #d4a574; margin: 0 0 10px 0;">${data.title}</h2>
              <p style="margin: 0; color: #ffd700;"><strong>Scheduled for:</strong> ${data.meeting_time}</p>
            </div>
            <p>Make sure to add this to your calendar!</p>
            <a href="${Deno.env.get("SITE_URL") || "https://lovable.dev"}/meeting" style="display: inline-block; background: #8b4513; color: #f5e6d3; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">View Meetings</a>
          </div>
        </div>
      `;

    default:
      return `<p>You have a new notification from War Room.</p>`;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipient_email, recipient_name, subject, data }: EmailRequest = await req.json();

    const htmlContent = getEmailTemplate(type, data, recipient_name);

    const emailResponse = await resend.emails.send({
      from: "War Room <onboarding@resend.dev>",
      to: [recipient_email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
