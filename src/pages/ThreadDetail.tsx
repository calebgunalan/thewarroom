import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, ArrowDown, MessageSquare, Upload, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { format } from "date-fns";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Thread {
  id: string;
  title: string;
  category: string;
  created_at: string;
  author_id: string;
  is_pinned: boolean;
  view_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Vote {
  post_id: string;
  vote_type: string;
}

const ThreadDetail = () => {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, { up: number; down: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      // Increment view count
      await supabase
        .from("threads")
        .update({ view_count: (thread?.view_count || 0) + 1 })
        .eq("id", threadId);

      // Fetch thread
      const { data: threadData } = await supabase
        .from("threads")
        .select(`
          *,
          profiles:author_id (username, avatar_url)
        `)
        .eq("id", threadId)
        .single();

      if (threadData) setThread(threadData);

      // Fetch posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id (username, avatar_url)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (postsData) setPosts(postsData);

      // Fetch user votes
      const { data: votesData } = await supabase
        .from("votes")
        .select("post_id, vote_type")
        .eq("user_id", user.id);

      if (votesData) setVotes(votesData);

      // Fetch vote counts for all posts
      if (postsData) {
        const counts: Record<string, { up: number; down: number }> = {};
        for (const post of postsData) {
          const { data: voteData } = await supabase
            .from("votes")
            .select("vote_type")
            .eq("post_id", post.id);
          
          counts[post.id] = {
            up: voteData?.filter(v => v.vote_type === "up").length || 0,
            down: voteData?.filter(v => v.vote_type === "down").length || 0,
          };
        }
        setVoteCounts(counts);
      }

      setLoading(false);
    };

    if (threadId) fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const { data: newPostData } = await supabase
            .from("posts")
            .select(`*, profiles:author_id (username, avatar_url)`)
            .eq("id", payload.new.id)
            .single();
          
          if (newPostData) setPosts((prev) => [...prev, newPostData]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, navigate]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async () => {
    if (!newPost.trim() && !imageFile) {
      toast.error("Please add some content or an image");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        thread_id: threadId,
        author_id: userId,
        content: newPost.trim(),
        image_url: imageUrl,
      });

      if (error) throw error;

      setNewPost("");
      setImageFile(null);
      setImagePreview(null);
      toast.success("Post added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!userId) return;

    const existingVote = votes.find(v => v.post_id === postId);
    
    try {
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote
          await supabase.from("votes").delete().match({ post_id: postId, user_id: userId });
          setVotes(votes.filter(v => v.post_id !== postId));
          setVoteCounts(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId],
              [voteType]: Math.max(0, prev[postId][voteType] - 1)
            }
          }));
        } else {
          // Change vote
          await supabase.from("votes").update({ vote_type: voteType }).match({ post_id: postId, user_id: userId });
          setVotes(votes.map(v => v.post_id === postId ? { ...v, vote_type: voteType } : v));
          const oppositeType = voteType === "up" ? "down" : "up";
          setVoteCounts(prev => {
            const current = prev[postId] || { up: 0, down: 0 };
            return {
              ...prev,
              [postId]: {
                up: voteType === "up" ? current.up + 1 : Math.max(0, current.up - 1),
                down: voteType === "down" ? current.down + 1 : Math.max(0, current.down - 1)
              }
            };
          });
        }
      } else {
        // Add new vote
        await supabase.from("votes").insert({ post_id: postId, user_id: userId, vote_type: voteType });
        setVotes([...votes, { post_id: postId, vote_type: voteType }]);
        setVoteCounts(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            [voteType]: (prev[postId]?.[voteType] || 0) + 1
          }
        }));
      }
    } catch (error: any) {
      toast.error("Failed to vote");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/threads")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Threads
        </Button>

        {thread && (
          <Card className="mb-6 elegant-shadow border-border/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{thread.category}</Badge>
                    {thread.is_pinned && <Badge variant="default">📌 Pinned</Badge>}
                  </div>
                  <h1 className="text-3xl font-serif font-bold mb-2">{thread.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={thread.profiles.avatar_url || undefined} />
                      <AvatarFallback>{thread.profiles.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{thread.profiles.username}</span>
                    <span>•</span>
                    <span>{format(new Date(thread.created_at), "MMM d, yyyy")}</span>
                    <span>•</span>
                    <span>{thread.view_count} views</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="space-y-4">
          {posts.map((post) => {
            const userVote = votes.find(v => v.post_id === post.id);
            const counts = voteCounts[post.id] || { up: 0, down: 0 };
            const score = counts.up - counts.down;

            return (
              <Card key={post.id} className="elegant-shadow border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(post.id, "up")}
                        className={userVote?.vote_type === "up" ? "text-primary" : ""}
                      >
                        <ArrowUp className="h-5 w-5" />
                      </Button>
                      <span className="text-sm font-semibold">{score}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(post.id, "down")}
                        className={userVote?.vote_type === "down" ? "text-destructive" : ""}
                      >
                        <ArrowDown className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.profiles.avatar_url || undefined} />
                          <AvatarFallback>{post.profiles.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{post.profiles.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      {post.content && <p className="text-foreground mb-3 whitespace-pre-wrap">{post.content}</p>}
                      {post.image_url && (
                        <img 
                          src={post.image_url} 
                          alt="Post attachment" 
                          className="rounded-lg max-w-full h-auto mb-3"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 elegant-shadow border-border/50">
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Add Your Reply
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="post-image"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("post-image")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Add Image
              </Button>
              <Button onClick={handleSubmitPost} disabled={submitting}>
                {submitting ? "Posting..." : "Post Reply"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ThreadDetail;
