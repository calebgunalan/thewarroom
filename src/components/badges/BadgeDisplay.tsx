import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Award, Star, Target, Rocket, Crown, Shield, Gem, MessageSquare, 
  MessagesSquare, PenTool, BookOpen, ThumbsUp, Heart, Users, CalendarCheck,
  Footprints
} from "lucide-react";
import { format } from "date-fns";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
  badges: BadgeData;
}

interface BadgeDisplayProps {
  userId: string;
  compact?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  star: Star,
  target: Target,
  rocket: Rocket,
  crown: Crown,
  shield: Shield,
  gem: Gem,
  "message-square": MessageSquare,
  "messages-square": MessagesSquare,
  "pen-tool": PenTool,
  "book-open": BookOpen,
  "thumbs-up": ThumbsUp,
  heart: Heart,
  users: Users,
  "calendar-check": CalendarCheck,
  footprints: Footprints,
};

const categoryColors: Record<string, string> = {
  tasks: "bg-green-500/20 text-green-400 border-green-500/30",
  reputation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  activity: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  voting: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  meetings: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const BadgeDisplay = ({ userId, compact = false }: BadgeDisplayProps) => {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    // Fetch user's earned badges
    const { data: earned } = await supabase
      .from("user_badges")
      .select(`
        badge_id,
        earned_at,
        badges (*)
      `)
      .eq("user_id", userId) as { data: UserBadge[] | null };

    // Fetch all badges for showing locked ones
    const { data: all } = await supabase
      .from("badges")
      .select("*")
      .order("category", { ascending: true });

    setUserBadges(earned || []);
    setAllBadges(all || []);
    setLoading(false);
  };

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading badges...</div>;
  }

  if (compact) {
    // Compact view - just show earned badges in a row
    if (userBadges.length === 0) {
      return <span className="text-sm text-muted-foreground">No badges yet</span>;
    }

    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {userBadges.slice(0, 6).map((ub) => {
            const IconComponent = iconMap[ub.badges.icon] || Award;
            return (
              <Tooltip key={ub.badge_id}>
                <TooltipTrigger>
                  <div className={`p-1.5 rounded-full border ${categoryColors[ub.badges.category]}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{ub.badges.name}</p>
                  <p className="text-xs text-muted-foreground">{ub.badges.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {userBadges.length > 6 && (
            <Badge variant="secondary" className="text-xs">
              +{userBadges.length - 6} more
            </Badge>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Full view - show all badges with earned/locked status
  const groupedBadges = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) acc[badge.category] = [];
    acc[badge.category].push(badge);
    return acc;
  }, {} as Record<string, BadgeData[]>);

  const categoryTitles: Record<string, string> = {
    tasks: "Task Achievements",
    reputation: "Reputation Milestones",
    activity: "Activity Badges",
    voting: "Community Recognition",
    meetings: "Meeting Participation",
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {Object.entries(groupedBadges).map(([category, badges]) => (
          <Card key={category} className="elegant-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{categoryTitles[category] || category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {badges.map((badge) => {
                  const earned = earnedBadgeIds.has(badge.id);
                  const userBadge = userBadges.find(ub => ub.badge_id === badge.id);
                  const IconComponent = iconMap[badge.icon] || Award;

                  return (
                    <Tooltip key={badge.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={`relative p-4 rounded-lg border text-center transition-all ${
                            earned
                              ? `${categoryColors[category]} cursor-default`
                              : "bg-muted/20 border-muted text-muted-foreground opacity-50 grayscale"
                          }`}
                        >
                          <IconComponent className={`h-8 w-8 mx-auto mb-2 ${earned ? "" : "opacity-50"}`} />
                          <p className="text-sm font-medium truncate">{badge.name}</p>
                          <p className="text-xs mt-1">+{badge.points} pts</p>
                          {!earned && (
                            <div className="absolute top-2 right-2">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        {earned && userBadge && (
                          <p className="text-xs text-accent mt-1">
                            Earned on {format(new Date(userBadge.earned_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default BadgeDisplay;
