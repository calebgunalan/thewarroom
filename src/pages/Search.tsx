import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/layout/Navbar";
import { Search as SearchIcon, MessageSquare, User, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  threads: any[];
  posts: any[];
  members: any[];
}

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ threads: [], posts: [], members: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      // Search threads
      const { data: threads } = await supabase
        .from("threads")
        .select("*, profiles(username)")
        .ilike("title", `%${query}%`)
        .limit(20);

      // Search posts
      const { data: posts } = await supabase
        .from("posts")
        .select("*, profiles(username), threads(title)")
        .ilike("content", `%${query}%`)
        .limit(20);

      // Search members
      const { data: members } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
        .limit(20);

      setResults({
        threads: threads || [],
        posts: posts || [],
        members: members || [],
      });
    } catch (error) {
      console.error("Search error:", error);
    }

    setLoading(false);
  };

  const totalResults = results.threads.length + results.posts.length + results.members.length;

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Search War Room</h1>

          <div className="flex gap-3 mb-8">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threads, posts, members..."
              className="text-lg"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="px-8">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SearchIcon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {searched && (
            <>
              <p className="text-muted-foreground mb-6">
                Found {totalResults} result{totalResults !== 1 ? "s" : ""} for "{query}"
              </p>

              <Tabs defaultValue="threads" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="threads">
                    Threads ({results.threads.length})
                  </TabsTrigger>
                  <TabsTrigger value="posts">
                    Posts ({results.posts.length})
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    Members ({results.members.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="threads" className="space-y-4">
                  {results.threads.map((thread) => (
                    <Card
                      key={thread.id}
                      className="elegant-shadow cursor-pointer hover:shadow-lg transition-smooth"
                      onClick={() => navigate(`/threads/${thread.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="h-5 w-5 text-accent mt-1" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{thread.title}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline">{thread.category}</Badge>
                              <span className="text-sm text-muted-foreground">
                                by {thread.profiles?.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(thread.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.threads.length === 0 && (
                    <Card className="elegant-shadow">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No threads found matching your search
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="posts" className="space-y-4">
                  {results.posts.map((post) => (
                    <Card
                      key={post.id}
                      className="elegant-shadow cursor-pointer hover:shadow-lg transition-smooth"
                      onClick={() => navigate(`/threads/${post.thread_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-primary mt-1" />
                          <div className="flex-1">
                            <p className="line-clamp-2">{post.content}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-sm text-muted-foreground">
                                in "{post.threads?.title}"
                              </span>
                              <span className="text-sm text-muted-foreground">
                                by {post.profiles?.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.posts.length === 0 && (
                    <Card className="elegant-shadow">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No posts found matching your search
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  {results.members.map((member) => (
                    <Card
                      key={member.id}
                      className="elegant-shadow cursor-pointer hover:shadow-lg transition-smooth"
                      onClick={() => navigate(`/profile?user=${member.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{member.username}</h3>
                            {member.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {member.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {results.members.length === 0 && (
                    <Card className="elegant-shadow">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No members found matching your search
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          {!searched && (
            <Card className="elegant-shadow">
              <CardContent className="py-16 text-center">
                <SearchIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">
                  Search for threads, posts, and members across War Room
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Search;