import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { CheckSquare, Video, AlertCircle, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { downloadICSFile } from "@/lib/calendar-export";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  deadline: string;
  status: string | null;
  description: string | null;
}

interface Meeting {
  id: string;
  title: string;
  scheduled_at: string | null;
  room_id: string;
  is_active: boolean | null;
}

const CalendarPage = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch tasks for the current user
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, deadline, status, description")
        .eq("assigned_to", user.id)
        .gte("deadline", monthStart.toISOString())
        .lte("deadline", monthEnd.toISOString());

      // Fetch meetings for the month
      const { data: meetingsData } = await supabase
        .from("meetings")
        .select("id, title, scheduled_at, room_id, is_active")
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString());

      setTasks(tasksData || []);
      setMeetings(meetingsData || []);
    };

    fetchData();
  }, [user, currentMonth]);

  const getEventsForDate = (date: Date) => {
    const dayTasks = tasks.filter((task) => 
      isSameDay(parseISO(task.deadline), date)
    );
    const dayMeetings = meetings.filter((meeting) => 
      meeting.scheduled_at && isSameDay(parseISO(meeting.scheduled_at), date)
    );
    return { tasks: dayTasks, meetings: dayMeetings };
  };

  const selectedEvents = getEventsForDate(selectedDate);

  // Get dates that have events for highlighting
  const datesWithEvents = [
    ...tasks.map((t) => parseISO(t.deadline)),
    ...meetings.filter((m) => m.scheduled_at).map((m) => parseISO(m.scheduled_at!)),
  ];

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleExportCalendar = () => {
    const events = [
      ...tasks.map((task) => ({
        title: `[Task] ${task.title}`,
        description: task.description || undefined,
        startDate: parseISO(task.deadline),
      })),
      ...meetings
        .filter((m) => m.scheduled_at)
        .map((meeting) => ({
          title: `[Meeting] ${meeting.title}`,
          description: `War Room Meeting - Room ID: ${meeting.room_id}`,
          startDate: parseISO(meeting.scheduled_at!),
          location: `https://meet.jit.si/${meeting.room_id}`,
        })),
    ];

    if (events.length === 0) {
      toast.error("No events to export for this month");
      return;
    }

    downloadICSFile(events, `war-room-${format(currentMonth, "yyyy-MM")}.ics`);
    toast.success(`Exported ${events.length} events to calendar`);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportCalendar}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Month
            </Button>
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 wood-grain">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full pointer-events-auto"
                modifiers={{
                  hasEvent: datesWithEvents,
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                    textDecorationColor: "hsl(var(--accent))",
                  },
                }}
                classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex w-full",
                  head_cell: "flex-1 text-muted-foreground font-medium text-sm py-2",
                  row: "flex w-full mt-2",
                  cell: "flex-1 text-center p-0 relative",
                  day: cn(
                    "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent/20 rounded-md transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                  ),
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  day_today: "bg-accent/20 text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                }}
              />
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <Card className="wood-grain">
            <CardHeader>
              <CardTitle className="text-lg">
                {format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEvents.tasks.length === 0 && selectedEvents.meetings.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No events scheduled for this day
                </p>
              ) : (
                <>
                  {/* Tasks */}
                  {selectedEvents.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                        task.status === "completed" 
                          ? "border-green-500/50 bg-green-500/10" 
                          : new Date(task.deadline) < new Date() 
                            ? "border-destructive/50 bg-destructive/10" 
                            : "border-accent/50 bg-accent/10"
                      )}
                      onClick={() => navigate("/tasks")}
                    >
                      <div className="flex items-start gap-3">
                        <CheckSquare className={cn(
                          "h-5 w-5 mt-0.5",
                          task.status === "completed" ? "text-green-500" : "text-accent"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{task.title}</span>
                            <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-xs">
                              {task.status || "pending"}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {format(parseISO(task.deadline), "h:mm a")}
                          </p>
                        </div>
                        {new Date(task.deadline) < new Date() && task.status !== "completed" && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Meetings */}
                  {selectedEvents.meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3 rounded-lg border border-primary/50 bg-primary/10 cursor-pointer transition-colors hover:bg-primary/20"
                      onClick={() => navigate(`/meeting/${meeting.room_id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <Video className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{meeting.title}</span>
                            {meeting.is_active && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                LIVE
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {meeting.scheduled_at && format(parseISO(meeting.scheduled_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="mt-6 wood-grain">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span>Task Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Meeting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>Overdue</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <MobileNavigation />
    </div>
  );
};

export default CalendarPage;
