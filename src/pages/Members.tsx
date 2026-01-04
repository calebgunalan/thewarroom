import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import Navbar from "@/components/layout/Navbar";
import { Trophy, Target, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";

interface MemberStats {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  tasksCompleted: number;
  totalTasks: number;
  strikes: number;
  threadCount: number;
  postCount: number;
  upvotesReceived: number;
  reputationScore: number;
}

const Members = () => {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    if (!profiles) return;

    const memberStats: MemberStats[] = [];

    for (const profile of profiles) {
      // Get role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .single();

      // Get tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status")
        .eq("assigned_to", profile.id);

      // Get strikes
      const { data: strikes } = await supabase
        .from("strikes")
        .select("id")
        .eq("user_id", profile.id);

      // Get threads
      const { data: threads } = await supabase
        .from("threads")
        .select("id")
        .eq("author_id", profile.id);

      // Get posts
      const { data: posts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", profile.id);

      // Get upvotes received
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", profile.id);

      let upvotesReceived = 0;
      if (userPosts) {
        for (const post of userPosts) {
          const { count } = await supabase
            .from("votes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)
            .eq("vote_type", "up");
          upvotesReceived += count || 0;
        }
      }

      const tasksCompleted = tasks?.filter(t => t.status === "completed").length || 0;
      const totalTasks = tasks?.length || 0;

      // Calculate reputation score
      const reputationScore = 
        (tasksCompleted * 10) + 
        (upvotesReceived * 5) + 
        ((threads?.length || 0) * 3) + 
        ((posts?.length || 0) * 1) -
        ((strikes?.length || 0) * 15);

      memberStats.push({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        role: roleData?.role || "member",
        tasksCompleted,
        totalTasks,
        strikes: strikes?.length || 0,
        threadCount: threads?.length || 0,
        postCount: posts?.length || 0,
        upvotesReceived,
        reputationScore: Math.max(0, reputationScore),
      });
    }

    // Sort by reputation score
    memberStats.sort((a, b) => b.reputationScore - a.reputationScore);
    setMembers(memberStats);
    setLoading(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      default: return "secondary";
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: "🥇", label: "Champion" };
    if (index === 1) return { icon: "🥈", label: "Elite" };
    if (index === 2) return { icon: "🥉", label: "Veteran" };
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">War Room Members</h1>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-accent" />
            <span className="text-lg font-semibold">Leaderboard</span>
          </div>
        </div>

        {/* Top 3 Leaderboard */}
        {members.length >= 3 && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {members.slice(0, 3).map((member, index) => {
              const rank = getRankBadge(index);
              return (
                <Card 
                  key={member.id} 
                  className={`elegant-shadow ${index === 0 ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-transparent' : ''}`}
                >
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-4">{rank?.icon}</div>
                    <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-accent/30">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl">{member.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold mb-2">{member.username}</h3>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="mb-3">
                      {member.role}
                    </Badge>
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-2xl font-bold">{member.reputationScore}</span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* All Members */}
        <div className="grid gap-4">
          {members.map((member, index) => {
            const completionRate = member.totalTasks > 0 
              ? (member.tasksCompleted / member.totalTasks) * 100 
              : 0;

            return (
              <Card key={member.id} className="elegant-shadow hover:shadow-lg transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-2xl font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </span>
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{member.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold truncate">{member.username}</h3>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                        {member.strikes > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {member.strikes}/3
                          </Badge>
                        )}
                      </div>
                      {member.bio && (
                        <p className="text-sm text-muted-foreground truncate mb-2">{member.bio}</p>
                      )}
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Task Progress:</span>
                        <Progress value={completionRate} className="w-24 h-2" />
                        <span className="text-muted-foreground">
                          {member.tasksCompleted}/{member.totalTasks}
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-accent">
                          <Target className="h-4 w-4" />
                          <span className="font-bold">{member.threadCount}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Threads</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-accent">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-bold">{member.postCount}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Posts</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-accent">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-bold">{member.upvotesReceived}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Upvotes</span>
                      </div>
                      <div className="text-center px-4 py-2 rounded-lg bg-accent/10">
                        <span className="text-2xl font-bold text-accent">{member.reputationScore}</span>
                        <span className="text-xs text-muted-foreground block">Rep Score</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {members.length === 0 && (
            <Card className="elegant-shadow">
              <CardContent className="py-16 text-center">
                <p className="text-lg text-muted-foreground">No members yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Members;
