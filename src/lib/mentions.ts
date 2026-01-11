import { supabase } from "@/integrations/supabase/client";

// Extract usernames from mentions in text
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? [...new Set(matches.map(m => m.slice(1)))] : [];
};

// Create notifications for mentioned users
export const notifyMentionedUsers = async (
  content: string,
  authorId: string,
  contentType: "post" | "chat" | "message",
  link: string
) => {
  const mentions = extractMentions(content);
  if (mentions.length === 0) return;

  // Get author's username
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", authorId)
    .single();

  const authorName = authorProfile?.username || "Someone";

  // Get user IDs from usernames
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", mentions);

  if (!profiles || profiles.length === 0) return;

  // Create notifications for each mentioned user (except the author)
  const notifications = profiles
    .filter((p) => p.id !== authorId)
    .map((profile) => ({
      user_id: profile.id,
      type: "mention",
      title: "You were mentioned",
      message: `${authorName} mentioned you in a ${contentType}`,
      link,
    }));

  if (notifications.length > 0) {
    // Use the create_notification function for each
    for (const notif of notifications) {
      await supabase.rpc("create_notification", {
        _user_id: notif.user_id,
        _type: notif.type,
        _title: notif.title,
        _message: notif.message,
        _link: notif.link,
      });
    }
  }
};
