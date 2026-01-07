import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, Star, TrendingUp, Trophy } from "lucide-react";

interface ReputationCardProps {
  userId: string;
}

interface ReputationData {
  upvotes: number;
  downvotes: number;
  postsCount: number;
  tasksCompleted: number;
  threadsStarted: number;
}

const LEVELS = [
  { name: "Rookie", minPoints: 0, icon: Star },
  { name: "Contributor", minPoints: 50, icon: TrendingUp },
  { name: "Veteran", minPoints: 150, icon: Award },
  { name: "Elite", minPoints: 300, icon: Trophy },
];

const ReputationCard = ({ userId }: ReputationCardProps) => {
  const [reputation, setReputation] = useState<ReputationData>({
    upvotes: 0,
    downvotes: 0,
    postsCount: 0,
    tasksCompleted: 0,
    threadsStarted: 0,
  });

  useEffect(() => {
    fetchReputation();
  }, [userId]);

  const fetchReputation = async () => {
    // Get upvotes on user's posts
    const { data: posts } = await supabase
      .from("posts")
      .select("id")
      .eq("author_id", userId);

    const postIds = posts?.map((p) => p.id) || [];

    let upvotes = 0;
    let downvotes = 0;

    if (postIds.length > 0) {
      const { data: votes } = await supabase
        .from("votes")
        .select("vote_type")
        .in("post_id", postIds);

      upvotes = votes?.filter((v) => v.vote_type === "up").length || 0;
      downvotes = votes?.filter((v) => v.vote_type === "down").length || 0;
    }

    // Get completed tasks
    const { count: tasksCompleted } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", userId)
      .eq("status", "completed");

    // Get threads started
    const { count: threadsStarted } = await supabase
      .from("threads")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId);

    setReputation({
      upvotes,
      downvotes,
      postsCount: postIds.length,
      tasksCompleted: tasksCompleted || 0,
      threadsStarted: threadsStarted || 0,
    });
  };

  const calculatePoints = () => {
    return (
      reputation.upvotes * 10 -
      reputation.downvotes * 5 +
      reputation.tasksCompleted * 20 +
      reputation.threadsStarted * 5 +
      reputation.postsCount * 2
    );
  };

  const points = calculatePoints();

  const getCurrentLevel = () => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (points >= LEVELS[i].minPoints) {
        return { level: LEVELS[i], index: i };
      }
    }
    return { level: LEVELS[0], index: 0 };
  };

  const { level: currentLevel, index: levelIndex } = getCurrentLevel();
  const nextLevel = LEVELS[levelIndex + 1];
  const progressToNext = nextLevel
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;

  const LevelIcon = currentLevel.icon;

  return (
    <Card className="elegant-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Reputation
          </span>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {points} pts
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Level */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <LevelIcon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">{currentLevel.name}</p>
            {nextLevel && (
              <p className="text-sm text-muted-foreground">
                {nextLevel.minPoints - points} pts to {nextLevel.name}
              </p>
            )}
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevel && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progressToNext)}%</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* Stats Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2 rounded bg-secondary/50 text-center">
            <p className="text-xl font-bold text-green-500">+{reputation.upvotes}</p>
            <p className="text-xs text-muted-foreground">Upvotes</p>
          </div>
          <div className="p-2 rounded bg-secondary/50 text-center">
            <p className="text-xl font-bold text-destructive">-{reputation.downvotes}</p>
            <p className="text-xs text-muted-foreground">Downvotes</p>
          </div>
          <div className="p-2 rounded bg-secondary/50 text-center">
            <p className="text-xl font-bold">{reputation.tasksCompleted}</p>
            <p className="text-xs text-muted-foreground">Tasks Done</p>
          </div>
          <div className="p-2 rounded bg-secondary/50 text-center">
            <p className="text-xl font-bold">{reputation.postsCount}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReputationCard;
