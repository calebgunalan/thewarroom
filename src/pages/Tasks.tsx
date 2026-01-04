import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/layout/Navbar";
import { toast } from "sonner";
import { Plus, CheckCircle, Clock, AlertTriangle, Target } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: string | null;
  assigned_to: string;
  assigned_by: string | null;
  created_at: string;
  completed_at: string | null;
  assignee: { username: string } | null;
  assigner: { username: string } | null;
}

interface Profile {
  id: string;
  username: string;
}

const Tasks = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    assigned_to: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (roleData) setUserRole(roleData.role);

      // Fetch all members for assignment
      const { data: membersData } = await supabase
        .from("profiles")
        .select("id, username");
      
      if (membersData) setMembers(membersData);

      await fetchTasks(user.id, roleData?.role || "member");
    };

    init();
  }, []);

  const fetchTasks = async (currentUserId: string, role: string) => {
    let query = supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey (username),
        assigner:profiles!tasks_assigned_by_fkey (username)
      `)
      .order("deadline", { ascending: true });

    // If not admin/moderator, only show own tasks
    if (role === "member") {
      query = query.eq("assigned_to", currentUserId);
    }

    const { data } = await query;
    setTasks(data || []);
  };

  const createTask = async () => {
    if (!userId || !newTask.title || !newTask.deadline || !newTask.assigned_to) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("tasks").insert({
        title: newTask.title,
        description: newTask.description || null,
        deadline: newTask.deadline,
        assigned_to: newTask.assigned_to,
        assigned_by: userId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Task assigned successfully");
      setNewTask({ title: "", description: "", deadline: "", assigned_to: "" });
      setIsDialogOpen(false);
      await fetchTasks(userId, userRole);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;

      toast.success(`Task marked as ${status}`);
      if (userId) await fetchTasks(userId, userRole);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isModerator = userRole === "admin" || userRole === "moderator";

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const overdueTasks = tasks.filter(t => 
    t.status === "pending" && new Date(t.deadline) < new Date()
  );

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = new Date(task.deadline) < new Date() && task.status !== "completed";
    const isOwnTask = task.assigned_to === userId;

    return (
      <Card className={`elegant-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg">{task.title}</h3>
                <Badge variant={task.status === "completed" ? "default" : isOverdue ? "destructive" : "secondary"}>
                  {isOverdue ? "Overdue" : task.status}
                </Badge>
              </div>
              {task.description && (
                <p className="text-muted-foreground mb-3">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Due: {format(new Date(task.deadline), "MMM d, yyyy")}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned to: </span>
                  <span className="font-medium">{task.assignee?.username}</span>
                </div>
                {task.assigner && (
                  <div>
                    <span className="text-muted-foreground">By: </span>
                    <span>{task.assigner.username}</span>
                  </div>
                )}
              </div>
            </div>
            {isOwnTask && task.status !== "completed" && (
              <Button 
                onClick={() => updateTaskStatus(task.id, "completed")}
                className="shrink-0"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Task Management</h1>
            <p className="text-muted-foreground mt-2">
              {isModerator ? "Assign and track all member tasks" : "Your assigned missions"}
            </p>
          </div>
          {isModerator && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="accent-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task details..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Deadline *</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignee">Assign To *</Label>
                    <Select 
                      value={newTask.assigned_to}
                      onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createTask} className="w-full">
                    Assign Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="elegant-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingTasks.length}</div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedTasks.length}</div>
            </CardContent>
          </Card>
          <Card className="elegant-shadow border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{overdueTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {pendingTasks.length === 0 && (
              <Card className="elegant-shadow">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg">All tasks completed! Great work!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {completedTasks.length === 0 && (
              <Card className="elegant-shadow">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground">No completed tasks yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {tasks.length === 0 && (
              <Card className="elegant-shadow">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground">No tasks assigned yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Tasks;
