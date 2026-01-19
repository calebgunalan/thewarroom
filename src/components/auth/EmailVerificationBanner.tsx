import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, RefreshCw, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

const EmailVerificationBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !user.email_confirmed_at && user.email) {
      setEmail(user.email);
      setShowBanner(true);
    }
  };

  const resendVerification = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No email found");

      // Get user profile for username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const verificationUrl = `${window.location.origin}/auth/verify?token=${user.id}`;

      const { error } = await supabase.functions.invoke("send-verification-email", {
        body: {
          email: user.email,
          username: profile?.username || "Warrior",
          verificationUrl,
        },
      });

      if (error) throw error;

      toast.success("Verification email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!showBanner || dismissed) return null;

  return (
    <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
      <Mail className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm">
          Please verify your email address ({email}) to access all features.
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={resendVerification}
            disabled={sending}
            className="h-7"
          >
            {sending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Resend Email
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default EmailVerificationBanner;
