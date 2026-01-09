import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Check for tasks due within 24 hours
    const { data: upcomingTasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        description,
        deadline,
        assigned_to,
        profiles:assigned_to (
          id,
          username
        )
      `)
      .eq("status", "pending")
      .gte("deadline", now.toISOString())
      .lte("deadline", tomorrow.toISOString());

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
    }

    // Check for meetings starting within 1 hour
    const { data: upcomingMeetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(`
        id,
        title,
        scheduled_at,
        room_id
      `)
      .eq("is_active", true)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", oneHourFromNow.toISOString());

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
    }

    const emailsSent: string[] = [];

    // Send task reminders
    if (upcomingTasks && upcomingTasks.length > 0) {
      for (const task of upcomingTasks) {
        const profile = task.profiles as any;
        if (!profile) continue;

        // Get user email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(task.assigned_to);
        if (!authUser?.user?.email) continue;

        // Call send-email-notification function
        const emailPayload = {
          type: "task_reminder",
          recipient_email: authUser.user.email,
          recipient_name: profile.username || "Member",
          subject: `⏰ Task Reminder: ${task.title}`,
          data: {
            title: task.title,
            deadline: new Date(task.deadline).toLocaleString(),
            description: task.description || "",
          },
        };

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(emailPayload),
          });

          if (response.ok) {
            emailsSent.push(`Task reminder to ${authUser.user.email}`);
          }
        } catch (e) {
          console.error("Failed to send task reminder:", e);
        }
      }
    }

    // Send meeting reminders to all members
    if (upcomingMeetings && upcomingMeetings.length > 0) {
      // Get all active members
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .neq("status", "removed");

      if (profiles) {
        for (const meeting of upcomingMeetings) {
          for (const profile of profiles) {
            const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
            if (!authUser?.user?.email) continue;

            const emailPayload = {
              type: "meeting_reminder",
              recipient_email: authUser.user.email,
              recipient_name: profile.username || "Member",
              subject: `📅 Meeting Starting Soon: ${meeting.title}`,
              data: {
                title: meeting.title,
                meeting_time: new Date(meeting.scheduled_at!).toLocaleString(),
              },
            };

            try {
              const response = await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify(emailPayload),
              });

              if (response.ok) {
                emailsSent.push(`Meeting reminder to ${authUser.user.email}`);
              }
            } catch (e) {
              console.error("Failed to send meeting reminder:", e);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasksChecked: upcomingTasks?.length || 0,
        meetingsChecked: upcomingMeetings?.length || 0,
        emailsSent: emailsSent.length,
        details: emailsSent,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
