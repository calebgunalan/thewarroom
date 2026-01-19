import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, MessageSquare, Award, Users, 
  Zap, Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  link: string | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

const activityIcons: Record<string, React.ReactNode> = {
  task_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  thread_created: <MessageSquare className="h-4 w-4 text-blue-500" />,
  badge_earned: <Award className="h-4 w-4 text-amber-500" />,
  member_joined: <Users className="h-4 w-4 text-purple-500" />,
  default: <Zap className="h-4 w-4 text-accent" />,
};

const activityColors: Record<string, string> = {
  task_completed: "bg-green-500/10 border-green-500/30",
  thread_created: "bg-blue-500/10 border-blue-500/30",
  badge_earned: "bg-amber-500/10 border-amber-500/30",
  member_joined: "bg-purple-500/10 border-purple-500/30",
  default: "bg-accent/10 border-accent/30",
};

const ActivityFeed = ({ limit = 20, showHeader = true }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("activity_feed_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_feed",
        },
        async (payload) => {
          console.log("New activity:", payload);
          // Fetch the new activity with profile data
          const { data } = await supabase
            .from("activity_feed")
            .select(`
              *,
              profiles:user_id (username, avatar_url)
            `)
            .eq("id", payload.new.id)
            .single();
          
          if (data) {
            setActivities((prev) => [data as Activity, ...prev].slice(0, limit));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("activity_feed")
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching activities:", error);
    } else {
      setActivities((data as Activity[]) || []);
    }
    setLoading(false);
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.link) {
      navigate(activity.link);
    }
  };

  if (loading) {
    return (
      <Card className="elegant-shadow">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Activity Feed
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="elegant-shadow">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            Activity Feed
            <Badge variant="secondary" className="ml-auto">Live</Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-3">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No activity yet</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${
                    activityColors[activity.activity_type] || activityColors.default
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activity.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {activity.profiles?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {activityIcons[activity.activity_type] || activityIcons.default}
                      <span className="font-medium text-sm truncate">
                        {activity.profiles?.username || "Unknown"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
