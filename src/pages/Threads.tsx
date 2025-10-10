import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import { User } from "@supabase/supabase-js";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";

const Threads = () => {
  const [user, setUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [newThread, setNewThread] = useState({ title: "", category: "", content: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchThreads();

    const channel = supabase
      .channel("threads-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, () => {
        fetchThreads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchThreads = async () => {
    const { data } = await supabase
      .from("threads")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });
    setThreads(data || []);
  };

  const createThread = async () => {
    if (!user) return;

    try {
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          title: newThread.title,
          category: newThread.category,
          author_id: user.id,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      const { error: postError } = await supabase
        .from("posts")
        .insert({
          thread_id: thread.id,
          author_id: user.id,
          content: newThread.content,
        });

      if (postError) throw postError;

      toast.success("Thread created successfully");
      setNewThread({ title: "", category: "", content: "" });
      setIsDialogOpen(false);
      fetchThreads();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Strategic Discussions</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-glow">
                <Plus className="mr-2 h-4 w-4" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Discussion</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Discussion topic..."
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newThread.category}
                    onChange={(e) => setNewThread({ ...newThread, category: e.target.value })}
                    placeholder="e.g., Strategy, Updates, Ideas"
                  />
                </div>
                <div>
                  <Label htmlFor="content">Initial Message</Label>
                  <Textarea
                    id="content"
                    value={newThread.content}
                    onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                    placeholder="Start the conversation..."
                    rows={5}
                  />
                </div>
                <Button onClick={createThread} className="w-full">
                  Create Thread
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {threads.map((thread) => (
            <Card 
              key={thread.id} 
              className="elegant-shadow hover:shadow-lg transition-smooth cursor-pointer"
              onClick={() => window.location.href = `/threads/${thread.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{thread.title}</CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{thread.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        by {thread.profiles?.username || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(thread.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
              </CardHeader>
            </Card>
          ))}
          {threads.length === 0 && (
            <Card className="elegant-shadow">
              <CardContent className="py-16 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">No discussions yet. Start the first one!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Threads;
