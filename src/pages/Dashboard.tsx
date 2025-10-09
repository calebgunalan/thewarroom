import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import { User } from "@supabase/supabase-js";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [strikes, setStrikes] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);

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

    setTasks(tasksData || []);
    setStrikes(strikesData || []);
    setThreads(threadsData || []);
  };

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen wood-grain">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Command Center</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Target className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.filter(t => t.status === "pending").length}</div>
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
              <Progress value={taskCompletionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accountability</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{strikes.length}/3</div>
              <p className="text-xs text-muted-foreground">Strikes received</p>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contributions</CardTitle>
              <CheckCircle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{threads.length}</div>
              <p className="text-xs text-muted-foreground">Threads started</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No tasks assigned yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="elegant-shadow">
            <CardHeader>
              <CardTitle>Recent Discussions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {threads.map((thread) => (
                  <div key={thread.id} className="p-3 rounded-lg bg-secondary/50">
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
                  <p className="text-muted-foreground text-center py-8">No discussions started yet</p>
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
