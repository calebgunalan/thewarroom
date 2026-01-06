import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flag } from "lucide-react";

interface ReportButtonProps {
  contentType: "post" | "thread" | "message" | "user";
  contentId: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "lg" | "icon";
}

const REPORT_REASONS = [
  "Spam or misleading",
  "Harassment or bullying",
  "Hate speech or discrimination",
  "Inappropriate content",
  "Off-topic or irrelevant",
  "Other",
];

const ReportButton = ({ contentType, contentId, variant = "ghost", size = "sm" }: ReportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to report content");
        return;
      }

      const fullReason = details ? `${reason}: ${details}` : reason;

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reason: fullReason,
      });

      if (error) throw error;

      toast.success("Report submitted. Thank you for helping keep the community safe.");
      setIsOpen(false);
      setReason("");
      setDetails("");
    } catch (error: any) {
      toast.error(error.message);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Flag className="h-4 w-4" />
          {size !== "icon" && <span className="ml-1">Report</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {contentType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason for reporting</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Additional details (optional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context..."
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportButton;