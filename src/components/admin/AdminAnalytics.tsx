import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, MessageSquare, CheckCircle, AlertTriangle, FileText, Video } from "lucide-react";

interface Analytics {
  totalUsers: number;
  activeUsers: number;
  removedUsers: number;
  totalThreads: number;
  totalPosts: number;
  totalMessages: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalStrikes: number;
  totalMeetings: number;
  totalChatRooms: number;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    activeUsers: 0,
    removedUsers: 0,
    totalThreads: 0,
    totalPosts: 0,
    totalMessages: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalStrikes: 0,
    totalMeetings: 0,
    totalChatRooms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Fetch all counts in parallel
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: removedUsers },
      { count: totalThreads },
      { count: totalPosts },
      { count: totalMessages },
      { count: totalTasks },
      { count: completedTasks },
      { count: pendingTasks },
      { count: totalStrikes },
      { count: totalMeetings },
      { count: totalChatRooms },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "removed"),
      supabase.from("threads").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("strikes").select("*", { count: "exact", head: true }),
      supabase.from("meetings").select("*", { count: "exact", head: true }),
      supabase.from("chat_rooms").select("*", { count: "exact", head: true }),
    ]);

    setAnalytics({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      removedUsers: removedUsers || 0,
      totalThreads: totalThreads || 0,
      totalPosts: totalPosts || 0,
      totalMessages: totalMessages || 0,
      totalTasks: totalTasks || 0,
      completedTasks: completedTasks || 0,
      pendingTasks: pendingTasks || 0,
      totalStrikes: totalStrikes || 0,
      totalMeetings: totalMeetings || 0,
      totalChatRooms: totalChatRooms || 0,
    });
    setLoading(false);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "text-accent",
    subValue,
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    subValue?: string;
  }) => (
    <Card className="elegant-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subValue && (
          <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  const taskCompletionRate = analytics.totalTasks > 0 
    ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Community Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Members"
              value={analytics.totalUsers}
              icon={Users}
              subValue={`${analytics.activeUsers} active, ${analytics.removedUsers} removed`}
            />
            <StatCard
              title="Discussion Threads"
              value={analytics.totalThreads}
              icon={FileText}
              subValue={`${analytics.totalPosts} total posts`}
            />
            <StatCard
              title="Direct Messages"
              value={analytics.totalMessages}
              icon={MessageSquare}
            />
            <StatCard
              title="Chat Rooms"
              value={analytics.totalChatRooms}
              icon={MessageSquare}
              color="text-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Task & Accountability Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Tasks"
              value={analytics.totalTasks}
              icon={CheckCircle}
              subValue={`${taskCompletionRate}% completion rate`}
            />
            <StatCard
              title="Completed Tasks"
              value={analytics.completedTasks}
              icon={CheckCircle}
              color="text-green-500"
            />
            <StatCard
              title="Pending Tasks"
              value={analytics.pendingTasks}
              icon={CheckCircle}
              color="text-yellow-500"
            />
            <StatCard
              title="Total Strikes"
              value={analytics.totalStrikes}
              icon={AlertTriangle}
              color="text-destructive"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              title="Total Meetings"
              value={analytics.totalMeetings}
              icon={Video}
              color="text-blue-500"
            />
            <div className="p-4 rounded-lg bg-secondary/30">
              <h4 className="font-medium mb-2">Engagement Overview</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Posts per Thread</span>
                  <span className="font-medium">
                    {analytics.totalThreads > 0 
                      ? (analytics.totalPosts / analytics.totalThreads).toFixed(1) 
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks per Member</span>
                  <span className="font-medium">
                    {analytics.activeUsers > 0 
                      ? (analytics.totalTasks / analytics.activeUsers).toFixed(1) 
                      : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Strikes per Member</span>
                  <span className="font-medium">
                    {analytics.totalUsers > 0 
                      ? (analytics.totalStrikes / analytics.totalUsers).toFixed(2) 
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;