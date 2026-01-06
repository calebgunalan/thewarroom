import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag, CheckCircle, XCircle, Eye, MessageSquare, FileText, User } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  notes: string | null;
  created_at: string;
  reporter?: { username: string };
}

const AdminReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey (username)
      `)
      .order("created_at", { ascending: false });

    setReports(data || []);
    setLoading(false);
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("reports")
        .update({
          status,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          notes: notes[reportId] || null,
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success(`Report marked as ${status}`);
      fetchReports();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-4 w-4" />;
      case "thread":
        return <MessageSquare className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "reviewed":
        return <Badge variant="outline">Reviewed</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="destructive">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");

  if (loading) {
    return <div className="animate-pulse">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Reports */}
      <Card className="elegant-shadow border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-yellow-500" />
            Pending Reports ({pendingReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No pending reports</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-secondary/30 border border-secondary"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getContentTypeIcon(report.content_type)}
                      <span className="font-medium capitalize">
                        {report.content_type} Report
                      </span>
                      {getStatusBadge(report.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(report.created_at), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-1">
                      Reported by: {report.reporter?.username || "Unknown"}
                    </p>
                    <p className="bg-secondary/50 p-3 rounded-lg">{report.reason}</p>
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add resolution notes..."
                      value={notes[report.id] || ""}
                      onChange={(e) =>
                        setNotes({ ...notes, [report.id]: e.target.value })
                      }
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateReportStatus(report.id, "resolved")}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateReportStatus(report.id, "dismissed")}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Reports */}
      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Report History ({resolvedReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedReports.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No report history</p>
          ) : (
            <div className="space-y-3">
              {resolvedReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/20"
                >
                  <div className="flex items-center gap-3">
                    {getContentTypeIcon(report.content_type)}
                    <div>
                      <span className="capitalize">{report.content_type} report</span>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {report.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(report.created_at), "MMM d")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;