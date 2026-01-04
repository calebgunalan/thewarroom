import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import { toast } from "sonner";
import { Edit, TrendingUp, Target, CheckCircle, MessageSquare, AlertTriangle, Plus } from "lucide-react";
import { format } from "date-fns";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface ProgressUpdate {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>("member");
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    totalTasks: 0,
    strikes: 0,
    threadCount: 0,
    postCount: 0,
    upvotesReceived: 0,
    reputationScore: 0,
  });
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ username: "", bio: "" });
  const [newProgress, setNewProgress] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setEditForm({ username: profileData.username, bio: profileData.bio || "" });
    }

    // Fetch role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (roleData) setRole(roleData.role);

    // Fetch stats
    const [tasksRes, strikesRes, threadsRes, postsRes] = await Promise.all([
      supabase.from("tasks").select("status").eq("assigned_to", user.id),
      supabase.from("strikes").select("id").eq("user_id", user.id),
      supabase.from("threads").select("id").eq("author_id", user.id),
      supabase.from("posts").select("id").eq("author_id", user.id),
    ]);

    // Get upvotes received
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

    const tasksCompleted = tasksRes.data?.filter(t => t.status === "completed").length || 0;
    const totalTasks = tasksRes.data?.length || 0;
    const strikeCount = strikesRes.data?.length || 0;

    const reputationScore = 
      (tasksCompleted * 10) + 
      (upvotesReceived * 5) + 
      ((threadsRes.data?.length || 0) * 3) + 
      ((postsRes.data?.length || 0) * 1) -
      (strikeCount * 15);

    setStats({
      tasksCompleted,
      totalTasks,
      strikes: strikeCount,
      threadCount: threadsRes.data?.length || 0,
      postCount: postsRes.data?.length || 0,
      upvotesReceived,
      reputationScore: Math.max(0, reputationScore),
    });

    // Fetch progress updates
    const { data: progressData } = await supabase
      .from("progress_updates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProgressUpdates(progressData || []);
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editForm.username,
          bio: editForm.bio || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
      setIsEditDialogOpen(false);
      fetchProfileData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const addProgressUpdate = async () => {
    if (!profile || !newProgress.title) {
      toast.error("Please enter a title");
      return;
    }

    try {
      const { error } = await supabase
        .from("progress_updates")
        .insert({
          user_id: profile.id,
          title: newProgress.title,
          description: newProgress.description || null,
        });

      if (error) throw error;

      toast.success("Progress update added");
      setNewProgress({ title: "", description: "" });
      setIsProgressDialogOpen(false);
      fetchProfileData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      default: return "secondary";
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const completionRate = stats.totalTasks > 0 
    ? (stats.tasksCompleted / stats.totalTasks) * 100 
    : 0;

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="elegant-shadow mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Avatar className="h-32 w-32 ring-4 ring-accent/30">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-4xl">{profile.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{profile.username}</h1>
                    <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
                      {role}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {profile.bio || "No bio set"}
                  </p>
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 text-accent">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-2xl font-bold">{stats.reputationScore}</span>
                      <span className="text-sm text-muted-foreground">Reputation</span>
                    </div>
                    {stats.strikes > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-bold">{stats.strikes}/3 Strikes</span>
                      </div>
                    )}
                  </div>
                </div>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={editForm.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          value={editForm.bio}
                          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          rows={3}
                        />
                      </div>
                      <Button onClick={updateProfile} className="w-full">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="elegant-shadow">
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.threadCount}</div>
                <p className="text-sm text-muted-foreground">Threads Started</p>
              </CardContent>
            </Card>
            <Card className="elegant-shadow">
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.postCount}</div>
                <p className="text-sm text-muted-foreground">Posts Made</p>
              </CardContent>
            </Card>
            <Card className="elegant-shadow">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{stats.tasksCompleted}/{stats.totalTasks}</div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </CardContent>
            </Card>
            <Card className="elegant-shadow">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-accent" />
                <div className="text-2xl font-bold">{stats.upvotesReceived}</div>
                <p className="text-sm text-muted-foreground">Upvotes Received</p>
              </CardContent>
            </Card>
          </div>

          {/* Task Progress */}
          <Card className="elegant-shadow mb-8">
            <CardHeader>
              <CardTitle>Task Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={completionRate} className="flex-1 h-4" />
                <span className="text-2xl font-bold">{completionRate.toFixed(0)}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.tasksCompleted} of {stats.totalTasks} tasks completed
              </p>
            </CardContent>
          </Card>

          {/* Progress Updates */}
          <Card className="elegant-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Progress Updates</CardTitle>
              <Dialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Progress Update</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="progressTitle">Title</Label>
                      <Input
                        id="progressTitle"
                        value={newProgress.title}
                        onChange={(e) => setNewProgress({ ...newProgress, title: e.target.value })}
                        placeholder="What did you accomplish?"
                      />
                    </div>
                    <div>
                      <Label htmlFor="progressDesc">Description (optional)</Label>
                      <Textarea
                        id="progressDesc"
                        value={newProgress.description}
                        onChange={(e) => setNewProgress({ ...newProgress, description: e.target.value })}
                        placeholder="More details..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={addProgressUpdate} className="w-full">
                      Add Update
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressUpdates.map((update) => (
                  <div key={update.id} className="p-4 rounded-lg bg-secondary/30 border-l-4 border-accent">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{update.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(update.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    {update.description && (
                      <p className="text-sm text-muted-foreground">{update.description}</p>
                    )}
                  </div>
                ))}
                {progressUpdates.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No progress updates yet. Share your achievements!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
