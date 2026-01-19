import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BadgeCheckRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId }: BadgeCheckRequest = await req.json();
    console.log(`Checking badges for user: ${userId}`);

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from("badges")
      .select("*");

    if (badgesError) throw badgesError;

    // Get user's existing badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId);

    if (userBadgesError) throw userBadgesError;

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

    // Get user stats
    const [tasksRes, threadsRes, postsRes] = await Promise.all([
      supabase.from("tasks").select("status").eq("assigned_to", userId),
      supabase.from("threads").select("id").eq("author_id", userId),
      supabase.from("posts").select("id").eq("author_id", userId),
    ]);

    const tasksCompleted = tasksRes.data?.filter(t => t.status === "completed").length || 0;
    const threadsCreated = threadsRes.data?.length || 0;
    const postsCreated = postsRes.data?.length || 0;

    // Calculate upvotes received
    let upvotesReceived = 0;
    if (postsRes.data) {
      for (const post of postsRes.data) {
        const { count } = await supabase
          .from("votes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id)
          .eq("vote_type", "up");
        upvotesReceived += count || 0;
      }
    }

    // Calculate reputation score
    const reputationScore = 
      (tasksCompleted * 10) + 
      (upvotesReceived * 5) + 
      (threadsCreated * 3) + 
      (postsCreated * 1);

    const stats: Record<string, number> = {
      tasks_completed: tasksCompleted,
      threads_created: threadsCreated,
      posts_created: postsCreated,
      upvotes_received: upvotesReceived,
      reputation_score: reputationScore,
      meetings_attended: 0, // TODO: Track meeting attendance
    };

    console.log(`User stats:`, stats);

    // Check which new badges should be awarded
    const newBadges: string[] = [];

    for (const badge of badges || []) {
      if (earnedBadgeIds.has(badge.id)) continue;

      const userValue = stats[badge.requirement_type] || 0;
      if (userValue >= badge.requirement_value) {
        // Award badge
        const { error: insertError } = await supabase
          .from("user_badges")
          .insert({
            user_id: userId,
            badge_id: badge.id,
          });

        if (!insertError) {
          newBadges.push(badge.name);
          console.log(`Awarded badge: ${badge.name}`);

          // Create notification
          await supabase.rpc("create_notification", {
            _user_id: userId,
            _type: "badge",
            _title: "New Badge Earned! 🏆",
            _message: `Congratulations! You've earned the "${badge.name}" badge: ${badge.description}`,
            _link: "/profile",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, newBadges, stats }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error checking badges:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
