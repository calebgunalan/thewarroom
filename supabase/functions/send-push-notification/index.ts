import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  userId: string;
  title: string;
  body: string;
  link?: string;
  type?: string;
}

// Web Push requires VAPID keys - using a simple notification approach
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, title, body, link, type }: PushRequest = await req.json();
    console.log(`Sending push notification to user: ${userId}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      
      // Fallback to in-app notification
      await supabase.rpc("create_notification", {
        _user_id: userId,
        _type: type || "push",
        _title: title,
        _message: body,
        _link: link || null,
      });

      return new Response(
        JSON.stringify({ success: true, method: "in-app", message: "Created in-app notification" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // For web push, we'd need VAPID keys
    // For now, create in-app notifications
    await supabase.rpc("create_notification", {
      _user_id: userId,
      _type: type || "push",
      _title: title,
      _message: body,
      _link: link || null,
    });

    console.log(`Notification sent successfully`);

    return new Response(
      JSON.stringify({ success: true, subscriptionCount: subscriptions.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
