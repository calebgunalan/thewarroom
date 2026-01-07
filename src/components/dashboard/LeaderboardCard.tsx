import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  points: number;
  tasksCompleted: number;
}

const LeaderboardCard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, status")
        .neq("status", "removed");

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Calculate points for each user
      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          // Get posts and votes
          const { data: posts } = await supabase
            .from("posts")
            .select("id")
            .eq("author_id", profile.id);

          const postIds = posts?.map((p) => p.id) || [];
          let upvotes = 0;
          let downvotes = 0;

          if (postIds.length > 0) {
            const { data: votes } = await supabase
              .from("votes")
              .select("vote_type")
              .in("post_id", postIds);

            upvotes = votes?.filter((v) => v.vote_type === "up").length || 0;
            downvotes = votes?.filter((v) => v.vote_type === "down").length || 0;
          }

          // Get completed tasks
          const { count: tasksCompleted } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", profile.id)
            .eq("status", "completed");

          // Get threads
          const { count: threadsCount } = await supabase
            .from("threads")
            .select("*", { count: "exact", head: true })
            .eq("author_id", profile.id);

          const points =
            upvotes * 10 -
            downvotes * 5 +
            (tasksCompleted || 0) * 20 +
            (threadsCount || 0) * 5 +
            (posts?.length || 0) * 2;

          return {
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            points,
            tasksCompleted: tasksCompleted || 0,
          };
        })
      );

      // Sort by points and take top 10
      leaderboardData.sort((a, b) => b.points - a.points);
      setLeaderboard(leaderboardData.slice(0, 10));
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">
            {index + 1}
          </span>
        );
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case 1:
        return "bg-gray-400/20 text-gray-400 border-gray-400/30";
      case 2:
        return "bg-amber-600/20 text-amber-600 border-amber-600/30";
      default:
        return "";
    }
  };

  return (
    <Card className="elegant-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leaderboard...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No members yet
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                onClick={() => navigate(`/profile/${entry.id}`)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border/50 ${
                  index < 3 ? getRankBadge(index) : ""
                }`}
              >
                <div className="w-8 flex justify-center">{getRankIcon(index)}</div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>
                    {entry.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.tasksCompleted} tasks completed
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {entry.points} pts
                </Badge>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
