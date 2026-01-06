import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Users, Video, Image as ImageIcon } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import AudioRecorder from "@/components/chat/AudioRecorder";
import AudioPlayer from "@/components/chat/AudioPlayer";
import TypingIndicator from "@/components/chat/TypingIndicator";
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
  image_url: string | null;
  audio_url: string | null;
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
  const [username, setUsername] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const initializeMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (profile) setUsername(profile.username);

      const { data: usersData } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id);
      
      if (usersData) setAllUsers(usersData);

      await fetchConversations(user.id);
    };

    initializeMessages();

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

      // Setup presence for typing indicator
      const channelName = [userId, selectedUser.id].sort().join('-');
      presenceChannelRef.current = supabase.channel(`dm-typing-${channelName}`)
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannelRef.current?.presenceState();
          if (state) {
            const typingUsernames = Object.values(state)
              .flat()
              .filter((p: any) => p.typing && p.user_id !== userId)
              .map((p: any) => p.username);
            setTypingUsers(typingUsernames);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannelRef.current?.track({
              user_id: userId,
              username: username,
              typing: false,
            });
          }
        });
    }

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [selectedUser, userId, username]);

  const handleTyping = useCallback(() => {
    if (!presenceChannelRef.current || !userId) return;

    presenceChannelRef.current.track({
      user_id: userId,
      username: username,
      typing: true,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({
        user_id: userId,
        username: username,
        typing: false,
      });
    }, 2000);
  }, [userId, username]);

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
    if ((!newMessage.trim() && !pendingAudioUrl && !pendingImageFile) || !selectedUser || !userId) return;

    let imageUrl = null;

    if (pendingImageFile) {
      const fileExt = pendingImageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(`dm/${fileName}`, pendingImageFile);

      if (uploadError) {
        toast.error("Failed to upload image");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(uploadData.path);
      
      imageUrl = publicUrl;
    }

    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedUser.id,
        content: newMessage.trim() || (pendingAudioUrl ? "🎤 Voice note" : "📷 Image"),
        image_url: imageUrl,
        audio_url: pendingAudioUrl,
      });

      if (error) throw error;

      setNewMessage("");
      setPendingAudioUrl(null);
      setPendingImageFile(null);
      
      // Stop typing indicator
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: userId,
          username: username,
          typing: false,
        });
      }
      
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

  const openVideoCall = () => {
    if (selectedUser) {
      const roomId = `dm-${[userId, selectedUser.id].sort().join('-')}`;
      window.open(`https://meet.jit.si/${roomId}`, "_blank");
    }
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
                          {conv.lastMessage.audio_url ? "🎤 Voice note" : conv.lastMessage.content}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={selectedUser.avatar_url || undefined} />
                        <AvatarFallback>{selectedUser.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <CardTitle>{selectedUser.username}</CardTitle>
                    </div>
                    <Button variant="outline" size="icon" onClick={openVideoCall} title="Start video call">
                      <Video className="h-4 w-4" />
                    </Button>
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
                              {msg.audio_url ? (
                                <AudioPlayer src={msg.audio_url} />
                              ) : (
                                <p>{msg.content}</p>
                              )}
                              {msg.image_url && (
                                <img 
                                  src={msg.image_url} 
                                  alt="Shared" 
                                  className="mt-2 rounded-lg max-w-full max-h-60 object-cover"
                                />
                              )}
                              <p className="text-xs mt-1 opacity-70">
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  <TypingIndicator typingUsers={typingUsers} />
                  
                  <div className="p-4 border-t border-border/50">
                    {(pendingImageFile || pendingAudioUrl) && (
                      <div className="mb-2 p-2 bg-muted rounded flex items-center gap-2">
                        {pendingImageFile && (
                          <>
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-sm truncate">{pendingImageFile.name}</span>
                            <Button size="sm" variant="ghost" onClick={() => setPendingImageFile(null)}>×</Button>
                          </>
                        )}
                        {pendingAudioUrl && (
                          <>
                            <AudioPlayer src={pendingAudioUrl} className="flex-1" />
                            <Button size="sm" variant="ghost" onClick={() => setPendingAudioUrl(null)}>×</Button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPendingImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="dm-image-upload"
                      />
                      <label htmlFor="dm-image-upload">
                        <Button type="button" variant="outline" size="icon" asChild>
                          <span><ImageIcon className="h-4 w-4" /></span>
                        </Button>
                      </label>
                      {userId && (
                        <AudioRecorder 
                          userId={userId} 
                          onAudioReady={(url) => setPendingAudioUrl(url)} 
                        />
                      )}
                      <Input
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
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