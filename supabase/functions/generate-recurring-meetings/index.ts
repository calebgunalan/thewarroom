import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Checking for recurring meetings to generate...");

    // Get all recurring parent meetings
    const { data: recurringMeetings, error } = await supabase
      .from("meetings")
      .select("*")
      .not("recurrence_type", "is", null)
      .is("parent_meeting_id", null);

    if (error) throw error;

    const now = new Date();
    const generatedMeetings: string[] = [];

    for (const meeting of recurringMeetings || []) {
      if (!meeting.scheduled_at || !meeting.recurrence_type) continue;

      const endDate = meeting.recurrence_end_date 
        ? new Date(meeting.recurrence_end_date) 
        : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead max

      // Get the last scheduled instance
      const { data: lastInstance } = await supabase
        .from("meetings")
        .select("scheduled_at")
        .or(`id.eq.${meeting.id},parent_meeting_id.eq.${meeting.id}`)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .single();

      let lastDate = new Date(lastInstance?.scheduled_at || meeting.scheduled_at);
      const interval = meeting.recurrence_interval || 1;

      // Generate next occurrences (up to 4 ahead)
      for (let i = 0; i < 4; i++) {
        let nextDate: Date;

        switch (meeting.recurrence_type) {
          case "daily":
            nextDate = new Date(lastDate.getTime() + interval * 24 * 60 * 60 * 1000);
            break;
          case "weekly":
            nextDate = new Date(lastDate.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
            break;
          case "monthly":
            nextDate = new Date(lastDate);
            nextDate.setMonth(nextDate.getMonth() + interval);
            break;
          default:
            continue;
        }

        // Check if we should generate this instance
        if (nextDate > endDate) break;
        if (nextDate < now) {
          lastDate = nextDate;
          continue;
        }

        // Check if this instance already exists
        const { data: existing } = await supabase
          .from("meetings")
          .select("id")
          .eq("parent_meeting_id", meeting.id)
          .eq("scheduled_at", nextDate.toISOString())
          .single();

        if (!existing) {
          const roomId = `${meeting.room_id}-${nextDate.getTime()}`;
          
          const { error: insertError } = await supabase
            .from("meetings")
            .insert({
              title: meeting.title,
              room_id: roomId,
              scheduled_at: nextDate.toISOString(),
              created_by: meeting.created_by,
              parent_meeting_id: meeting.id,
            });

          if (!insertError) {
            generatedMeetings.push(`${meeting.title} on ${nextDate.toISOString()}`);
            console.log(`Generated recurring meeting: ${meeting.title} for ${nextDate.toISOString()}`);
          }
        }

        lastDate = nextDate;
      }
    }

    return new Response(
      JSON.stringify({ success: true, generatedMeetings }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error generating recurring meetings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
