import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/layout/Navbar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import { 
  Trophy, Target, CheckCircle, TrendingUp, Users, Search, 
  Filter, SortAsc, SortDesc, Mail, Crown, Shield, User as UserIcon
} from "lucide-react";

interface MemberStats {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  status: string;
  tasksCompleted: number;
  threadCount: number;
  postCount: number;
  upvotesReceived: number;
  reputationScore: number;
  created_at: string;
}

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("reputation");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    filterAndSortMembers();
  }, [members, searchQuery, roleFilter, sortBy, sortOrder]);

  const fetchMembers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .neq("status", "removed");

    if (!profiles) {
      setLoading(false);
      return;
    }

    const memberStats: MemberStats[] = [];

    for (const profile of profiles) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .single();

      const { data: tasks } = await supabase
        .from("tasks")
        .select("status")
        .eq("assigned_to", profile.id);

      const { data: threads } = await supabase
        .from("threads")
        .select("id")
        .eq("author_id", profile.id);

      const { data: posts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", profile.id);

      let upvotesReceived = 0;
      if (posts) {
        for (const post of posts) {
          const { count } = await supabase
            .from("votes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id)
            .eq("vote_type", "up");
          upvotesReceived += count || 0;
        }
      }

      const tasksCompleted = tasks?.filter(t => t.status === "completed").length || 0;
      const reputationScore = 
        (tasksCompleted * 10) + 
        (upvotesReceived * 5) + 
        ((threads?.length || 0) * 3) + 
        ((posts?.length || 0) * 1);

      memberStats.push({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        role: roleData?.role || "member",
        status: profile.status || "active",
        tasksCompleted,
        threadCount: threads?.length || 0,
        postCount: posts?.length || 0,
        upvotesReceived,
        reputationScore: Math.max(0, reputationScore),
        created_at: profile.created_at || "",
      });
    }

    setMembers(memberStats);
    setLoading(false);
  };

  const filterAndSortMembers = () => {
    let result = [...members];

    // Search
    if (searchQuery) {
      result = result.filter(m =>
        m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter(m => m.role === roleFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "reputation":
          comparison = a.reputationScore - b.reputationScore;
          break;
        case "tasks":
          comparison = a.tasksCompleted - b.tasksCompleted;
          break;
        case "username":
          comparison = a.username.localeCompare(b.username);
          break;
        case "joined":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    setFilteredMembers(result);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Crown className="h-4 w-4 text-amber-500" />;
      case "moderator": return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <UserIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "moderator": return "default";
      default: return "secondary";
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  };

  const handleMemberClick = (memberId: string) => {
    navigate(`/profile/${memberId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen wood-grain pb-20 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-10 w-10 text-accent" />
            <div>
              <h1 className="text-4xl font-bold">Member Directory</h1>
              <p className="text-muted-foreground">{filteredMembers.length} active members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <span className="font-semibold">Leaderboard</span>
          </div>
        </div>

        {/* Filters */}
        <Card className="elegant-shadow mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reputation">Reputation</SelectItem>
                  <SelectItem value="tasks">Tasks Completed</SelectItem>
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="joined">Join Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "desc" ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 */}
        {filteredMembers.length >= 3 && sortBy === "reputation" && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {filteredMembers.slice(0, 3).map((member, index) => (
              <Card 
                key={member.id} 
                className={`elegant-shadow cursor-pointer hover:scale-105 transition-smooth ${
                  index === 0 ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent' : ''
                }`}
                onClick={() => handleMemberClick(member.id)}
              >
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl mb-4">{getRankBadge(index)}</div>
                  <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-accent/30">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">{member.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">{member.username}</h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize mb-3">
                    {member.role}
                  </Badge>
                  <div className="flex items-center justify-center gap-2 text-accent">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-2xl font-bold">{member.reputationScore}</span>
                    <span className="text-sm text-muted-foreground">points</span>
                  </div>
                  <div className="mt-3">
                    <BadgeDisplay userId={member.id} compact />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Members List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member, index) => (
            <Card 
              key={member.id} 
              className="elegant-shadow hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => handleMemberClick(member.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-accent/30">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-lg">
                        {member.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {sortBy === "reputation" && index < 3 && (
                      <span className="absolute -top-1 -right-1 text-lg">{getRankBadge(index)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{member.username}</h3>
                      {getRoleIcon(member.role)}
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize text-xs mb-2">
                      {member.role}
                    </Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {member.bio || "No bio set"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-accent">
                      <TrendingUp className="h-3 w-3" />
                      <span className="font-bold text-sm">{member.reputationScore}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Rep</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle className="h-3 w-3" />
                      <span className="font-bold text-sm">{member.tasksCompleted}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Tasks</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-blue-500">
                      <Target className="h-3 w-3" />
                      <span className="font-bold text-sm">{member.threadCount}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Threads</span>
                  </div>
                </div>

                <div className="mt-3">
                  <BadgeDisplay userId={member.id} compact />
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${member.id}`);
                    }}
                  >
                    View Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/messages?user=${member.id}`);
                    }}
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredMembers.length === 0 && (
            <div className="col-span-full">
              <Card className="elegant-shadow">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No members found matching your criteria</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default Members;
