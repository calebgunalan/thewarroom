import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import ReputationCard from "@/components/dashboard/ReputationCard";
import LeaderboardCard from "@/components/dashboard/LeaderboardCard";
import UpcomingMeetings from "@/components/dashboard/UpcomingMeetings";
import { User } from "@supabase/supabase-js";
import { Target, TrendingUp, AlertTriangle, CheckCircle, MessageSquare, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [strikes, setStrikes] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", user?.id)
      .order("deadline", { ascending: true });

    const { data: strikesData } = await supabase
      .from("strikes")
      .select("*")
      .eq("user_id", user?.id);

    const { data: threadsData } = await supabase
      .from("threads")
      .select("*")
      .eq("author_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get unread messages count
    const { count: messagesCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user?.id)
      .eq("read", false);

    // Get total member count
    const { count: members } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .neq("status", "removed");

    setTasks(tasksData || []);
    setStrikes(strikesData || []);
    setThreads(threadsData || []);
    setRecentMessages(messagesCount || 0);
    setMemberCount(members || 0);
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
  const pendingTasks = tasks.filter(t => t.status === "pending");

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Command Center</h1>
            <p className="text-muted-foreground mt-1">Welcome back, Commander</p>
          </div>
          <Button onClick={() => navigate("/tasks")} variant="outline">
            View All Tasks
          </Button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-8">
          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Target className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <p className="text-xs text-muted-foreground">Missions in progress</p>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskCompletionRate.toFixed(0)}%</div>
              <Progress value={taskCompletionRate} className="mt-2 h-1" />
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Strikes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{strikes.length}/3</div>
              <Progress value={(strikes.length / 3) * 100} className="mt-2 h-1 bg-destructive/20" />
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Threads</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{threads.length}</div>
              <p className="text-xs text-muted-foreground">Discussions started</p>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentMessages}</div>
              <p className="text-xs text-muted-foreground">Unread messages</p>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Members</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberCount}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Left Column - Reputation */}
          {user && <ReputationCard userId={user.id} />}

          {/* Middle Column - Upcoming Meetings */}
          <UpcomingMeetings />

          {/* Right Column - Leaderboard */}
          <LeaderboardCard />
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingTasks.slice(0, 5).map((task) => {
                  const deadline = new Date(task.deadline);
                  const isOverdue = deadline < new Date();
                  const isDueSoon = !isOverdue && deadline.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isOverdue 
                          ? "bg-destructive/10 border border-destructive/30" 
                          : isDueSoon 
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : "bg-secondary/50"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className={`text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          Due: {deadline.toLocaleDateString()}
                        </p>
                      </div>
                      {isOverdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : isDueSoon ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">Due Soon</Badge>
                      ) : (
                        <Badge variant="secondary">{task.status}</Badge>
                      )}
                    </div>
                  );
                })}
                {pendingTasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                    <p className="text-muted-foreground">All caught up! No pending tasks.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                Recent Discussions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {threads.map((thread) => (
                  <div 
                    key={thread.id} 
                    className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 cursor-pointer transition-colors"
                    onClick={() => navigate(`/threads/${thread.id}`)}
                  >
                    <p className="font-medium">{thread.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{thread.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(thread.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {threads.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No discussions started yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate("/threads")}
                    >
                      Start a Thread
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
