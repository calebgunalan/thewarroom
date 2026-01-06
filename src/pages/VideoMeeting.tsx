import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import { Video, Plus, Users, Calendar, ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  room_id: string;
  scheduled_at: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

const VideoMeeting = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", scheduledAt: "" });
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchMeetings();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (roomId) {
      fetchMeetingByRoomId(roomId);
    }
  }, [roomId]);

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .order("created_at", { ascending: false });
    
    setMeetings(data || []);
  };

  const fetchMeetingByRoomId = async (id: string) => {
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("room_id", id)
      .single();
    
    if (data) {
      setActiveMeeting(data);
    }
  };

  const createMeeting = async () => {
    if (!userId || !newMeeting.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    const roomIdGenerated = `warroom-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const { error } = await supabase.from("meetings").insert({
        title: newMeeting.title,
        room_id: roomIdGenerated,
        scheduled_at: newMeeting.scheduledAt || null,
        created_by: userId,
        is_active: false,
      });

      if (error) throw error;

      toast.success("Meeting created successfully");
      setNewMeeting({ title: "", scheduledAt: "" });
      setIsDialogOpen(false);
      fetchMeetings();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const joinMeeting = (meeting: Meeting) => {
    navigate(`/meeting/${meeting.room_id}`);
  };

  const openJitsiMeeting = () => {
    if (activeMeeting) {
      window.open(`https://meet.jit.si/${activeMeeting.room_id}`, "_blank");
    }
  };

  if (roomId && activeMeeting) {
    return (
      <div className="min-h-screen wood-grain">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate("/meeting")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
          
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Video className="h-6 w-6 text-primary" />
                {activeMeeting.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Click below to join the video meeting
                  </p>
                  <Button onClick={openJitsiMeeting} size="lg" className="accent-glow">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Join Video Call
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Room ID:</strong> {activeMeeting.room_id}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Share this link with others to invite them:{" "}
                  <code className="bg-background px-2 py-1 rounded text-xs">
                    {window.location.href}
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Video Meetings</h1>
            <p className="text-muted-foreground mt-2">Schedule and join video conferences</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="accent-glow">
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="e.g., Weekly Standup"
                  />
                </div>
                <div>
                  <Label htmlFor="scheduledAt">Schedule For (Optional)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={newMeeting.scheduledAt}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                  />
                </div>
                <Button onClick={createMeeting} className="w-full">Create Meeting</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="elegant-shadow border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  {meeting.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {meeting.scheduled_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(meeting.scheduled_at), "PPp")}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Room: {meeting.room_id.substring(0, 20)}...
                </div>
                <Button onClick={() => joinMeeting(meeting)} className="w-full">
                  Join Meeting
                </Button>
              </CardContent>
            </Card>
          ))}
          {meetings.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No meetings yet. Create one to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoMeeting;
