import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Users } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { format } from "date-fns";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender: Profile;
  recipient: Profile;
}

interface Conversation {
  user: Profile;
  lastMessage: Message;
  unreadCount: number;
}

const Messages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    const initializeMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch all users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);
      
      if (usersData) setAllUsers(usersData);

      // Fetch conversations
      await fetchConversations(user.id);
    };

    initializeMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          if (userId) fetchConversations(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (selectedUser && userId) {
      fetchMessages(userId, selectedUser.id);
    }
  }, [selectedUser, userId]);

  const fetchConversations = async (currentUserId: string) => {
    const { data: messagesData } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (id, username, avatar_url),
        recipient:profiles!messages_recipient_id_fkey (id, username, avatar_url)
      `)
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (!messagesData) return;

    const convMap = new Map<string, Conversation>();
    
    messagesData.forEach((msg: any) => {
      const otherUserId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      const otherUser = msg.sender_id === currentUserId ? msg.recipient : msg.sender;

      if (!convMap.has(otherUserId)) {
        const unreadCount = messagesData.filter(
          (m: any) => m.sender_id === otherUserId && m.recipient_id === currentUserId && !m.read
        ).length;

        convMap.set(otherUserId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount,
        });
      }
    });

    setConversations(Array.from(convMap.values()));
  };

  const fetchMessages = async (currentUserId: string, otherUserId: string) => {
    const { data: messagesData } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (id, username, avatar_url),
        recipient:profiles!messages_recipient_id_fkey (id, username, avatar_url)
      `)
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });

    if (messagesData) {
      setMessages(messagesData as any);
      
      // Mark messages as read
      const unreadIds = messagesData
        .filter((m: any) => m.recipient_id === currentUserId && !m.read)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !userId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedUser.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      await fetchMessages(userId, selectedUser.id);
      await fetchConversations(userId);
    } catch (error: any) {
      toast.error("Failed to send message");
    }
  };

  const startNewConversation = (user: Profile) => {
    setSelectedUser(user);
    setShowUserList(false);
  };

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          <Card className="elegant-shadow border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Conversations</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUserList(!showUserList)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-18rem)]">
                {showUserList ? (
                  <div className="space-y-2 p-4">
                    {allUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => startNewConversation(user)}
                      >
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.user.id}
                      className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-accent transition-colors border-b border-border/50 ${
                        selectedUser?.id === conv.user.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedUser(conv.user)}
                    >
                      <Avatar>
                        <AvatarImage src={conv.user.avatar_url || undefined} />
                        <AvatarFallback>{conv.user.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">{conv.user.username}</p>
                          {conv.unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 elegant-shadow border-border/50 flex flex-col">
            {selectedUser ? (
              <>
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{selectedUser.username}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === userId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isOwn
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p className="text-xs mt-1 opacity-70">
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      />
                      <Button onClick={sendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
