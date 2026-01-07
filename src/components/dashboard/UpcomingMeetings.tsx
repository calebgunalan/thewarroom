import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Clock, Users } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Meeting {
  id: string;
  title: string;
  room_id: string;
  scheduled_at: string | null;
  is_active: boolean;
  created_by: string | null;
  creator?: {
    username: string;
  };
}

const UpcomingMeetings = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("meetings-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings" },
        () => fetchMeetings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMeetings = async () => {
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("*")
      .or("is_active.eq.true,scheduled_at.gte." + new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    if (!meetingsData) {
      setLoading(false);
      return;
    }

    // Fetch creator profiles
    const creatorIds = meetingsData
      .filter((m) => m.created_by)
      .map((m) => m.created_by);
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", creatorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const enrichedMeetings = meetingsData.map((meeting) => ({
      ...meeting,
      creator: meeting.created_by ? profileMap.get(meeting.created_by) : undefined,
    }));

    setMeetings(enrichedMeetings);
    setLoading(false);
  };

  const joinMeeting = (roomId: string) => {
    navigate(`/meeting/${roomId}`);
  };

  return (
    <Card className="elegant-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-accent" />
          Upcoming Meetings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-4">
            Loading meetings...
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No upcoming meetings</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/meeting")}
            >
              Schedule a Meeting
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => {
              const isLive = meeting.is_active;
              const isUpcoming =
                meeting.scheduled_at &&
                isAfter(parseISO(meeting.scheduled_at), new Date());

              return (
                <div
                  key={meeting.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isLive ? "bg-green-500/20" : "bg-primary/20"
                    }`}
                  >
                    <Video
                      className={`h-5 w-5 ${
                        isLive ? "text-green-500" : "text-primary"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{meeting.title}</p>
                      {isLive && (
                        <Badge variant="destructive" className="animate-pulse">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {meeting.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(meeting.scheduled_at), "MMM d")}
                        </span>
                      )}
                      {meeting.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(meeting.scheduled_at), "h:mm a")}
                        </span>
                      )}
                      {meeting.creator && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {meeting.creator.username}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isLive ? "default" : "outline"}
                    onClick={() => joinMeeting(meeting.room_id)}
                  >
                    {isLive ? "Join Now" : "View"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingMeetings;
