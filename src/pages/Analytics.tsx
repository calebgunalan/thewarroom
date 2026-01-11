import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/layout/Navbar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Activity, CheckCircle, TrendingUp, Users } from "lucide-react";

interface TaskStats {
  date: string;
  completed: number;
  pending: number;
}

interface MemberActivity {
  username: string;
  posts: number;
  tasks: number;
  reputation: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [taskStats, setTaskStats] = useState<TaskStats[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [taskStatusData, setTaskStatusData] = useState<{ name: string; value: number }[]>([]);
  const [activityTrend, setActivityTrend] = useState<{ date: string; posts: number; messages: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      await fetchAnalytics();
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchAnalytics = async () => {
    // Fetch task completion rates over last 7 days
    const days = 7;
    const taskStatsPromises = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      taskStatsPromises.push(
        Promise.all([
          supabase
            .from("tasks")
            .select("id", { count: "exact" })
            .eq("status", "completed")
            .gte("completed_at", dayStart)
            .lte("completed_at", dayEnd),
          supabase
            .from("tasks")
            .select("id", { count: "exact" })
            .neq("status", "completed")
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd),
        ]).then(([completed, pending]) => ({
          date: format(date, "MMM d"),
          completed: completed.count || 0,
          pending: pending.count || 0,
        }))
      );
    }

    const taskStatsData = await Promise.all(taskStatsPromises);
    setTaskStats(taskStatsData);

    // Fetch overall task status distribution
    const [completedCount, pendingCount, inProgressCount] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "completed"),
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("tasks").select("id", { count: "exact" }).eq("status", "in_progress"),
    ]);

    setTaskStatusData([
      { name: "Completed", value: completedCount.count || 0 },
      { name: "Pending", value: pendingCount.count || 0 },
      { name: "In Progress", value: inProgressCount.count || 0 },
    ]);

    // Fetch activity trend (posts and messages per day)
    const activityPromises = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      activityPromises.push(
        Promise.all([
          supabase
            .from("posts")
            .select("id", { count: "exact" })
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd),
          supabase
            .from("chat_room_messages")
            .select("id", { count: "exact" })
            .gte("created_at", dayStart)
            .lte("created_at", dayEnd),
        ]).then(([posts, messages]) => ({
          date: format(date, "MMM d"),
          posts: posts.count || 0,
          messages: messages.count || 0,
        }))
      );
    }

    const activityData = await Promise.all(activityPromises);
    setActivityTrend(activityData);

    // Fetch member activity (top 10 members)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("status", "active")
      .limit(10);

    if (profiles) {
      const memberPromises = profiles.map(async (profile) => {
        const [postsResult, tasksResult, votesResult] = await Promise.all([
          supabase.from("posts").select("id", { count: "exact" }).eq("author_id", profile.id),
          supabase.from("tasks").select("id", { count: "exact" }).eq("assigned_to", profile.id).eq("status", "completed"),
          supabase.from("votes").select("id, vote_type").in("post_id", 
            (await supabase.from("posts").select("id").eq("author_id", profile.id)).data?.map(p => p.id) || []
          ),
        ]);

        const upvotes = votesResult.data?.filter(v => v.vote_type === "up").length || 0;
        const downvotes = votesResult.data?.filter(v => v.vote_type === "down").length || 0;

        return {
          username: profile.username,
          posts: postsResult.count || 0,
          tasks: tasksResult.count || 0,
          reputation: upvotes - downvotes,
        };
      });

      const memberData = await Promise.all(memberPromises);
      setMemberActivity(memberData.sort((a, b) => b.reputation - a.reputation));
    }
  };

  const COLORS = ["hsl(142, 76%, 36%)", "hsl(35, 60%, 45%)", "hsl(25, 45%, 28%)"];

  if (loading) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen wood-grain pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-accent" />
            Progress Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track task completion, reputation trends, and member activity
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="elegant-shadow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {taskStatusData.reduce((sum, d) => sum + d.value, 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {taskStatusData.find(d => d.name === "Completed")?.value || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberActivity.length}</div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activityTrend.reduce((sum, d) => sum + d.posts + d.messages, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Task Completion Trend */}
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle>Task Completion Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="hsl(142, 76%, 36%)" name="Completed" />
                  <Bar dataKey="pending" fill="hsl(35, 60%, 45%)" name="New Tasks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Status Distribution */}
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {taskStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Trend */}
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle>Community Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="hsl(25, 45%, 28%)"
                    strokeWidth={2}
                    name="Forum Posts"
                  />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="hsl(35, 60%, 45%)"
                    strokeWidth={2}
                    name="Chat Messages"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Member Leaderboard */}
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle>Member Activity Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={memberActivity.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="username"
                    stroke="hsl(var(--muted-foreground))"
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="posts" fill="hsl(25, 45%, 28%)" name="Posts" />
                  <Bar dataKey="tasks" fill="hsl(142, 76%, 36%)" name="Tasks Done" />
                  <Bar dataKey="reputation" fill="hsl(35, 60%, 45%)" name="Reputation" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default Analytics;
