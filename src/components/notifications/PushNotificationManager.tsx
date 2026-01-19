import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

const PushNotificationManager = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    setIsSubscribed(!!data && data.length > 0);
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    setLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribeToNotifications();
        toast.success("Push notifications enabled!");
      } else if (result === "denied") {
        toast.error("Notification permission denied");
      }
    } catch (error) {
      console.error("Error requesting permission:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // For now, just mark as subscribed in the database
      // Full Web Push implementation requires VAPID keys
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint: `browser-${navigator.userAgent.substring(0, 50)}`,
          p256dh: "placeholder",
          auth: "placeholder",
        }, {
          onConflict: "user_id,endpoint"
        });

      if (error) throw error;

      setIsSubscribed(true);
      
      // Show a test notification
      if (Notification.permission === "granted") {
        new Notification("War Room Notifications", {
          body: "You'll now receive alerts for tasks and meetings!",
          icon: "/icons/icon-192x192.png",
        });
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsSubscribed(false);
      toast.success("Notifications disabled");
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable notifications");
    } finally {
      setLoading(false);
    }
  };

  if (!("Notification" in window)) {
    return null;
  }

  if (permission === "denied") {
    return (
      <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
        <BellOff className="h-4 w-4 mr-2" />
        Blocked
      </Button>
    );
  }

  if (isSubscribed) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={unsubscribe}
        disabled={loading}
        className="text-green-500"
      >
        <BellRing className="h-4 w-4 mr-2" />
        Notifications On
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={requestPermission}
      disabled={loading}
    >
      <Bell className="h-4 w-4 mr-2" />
      Enable Notifications
    </Button>
  );
};

export default PushNotificationManager;
