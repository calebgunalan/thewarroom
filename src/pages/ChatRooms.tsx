import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/layout/Navbar";
import AudioRecorder from "@/components/chat/AudioRecorder";
import AudioPlayer from "@/components/chat/AudioPlayer";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { LocationSharing, LocationMessage } from "@/components/chat/LocationSharing";
import { toast } from "sonner";
import { Plus, Send, Users, Hash, Image as ImageIcon, Video, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_private: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  sender?: {
    username: string;
    avatar_url: string | null;
  };
}

const ChatRooms = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        if (profile) setUsername(profile.username);
        fetchRooms();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedRoom || !userId || !username) return;

    fetchMessages(selectedRoom.id);

    // Messages subscription
    const messageChannel = supabase
      .channel(`room-${selectedRoom.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_room_messages", filter: `room_id=eq.${selectedRoom.id}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", (payload.new as ChatMessage).sender_id)
            .single();

          setMessages(prev => [...prev, { ...(payload.new as ChatMessage), sender }]);
        }
      )
      .subscribe();

    // Presence channel for typing indicators
    presenceChannelRef.current = supabase.channel(`typing-${selectedRoom.id}`)
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

    return () => {
      supabase.removeChannel(messageChannel);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [selectedRoom, userId, username]);

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

  const fetchRooms = async () => {
    const { data } = await supabase
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    setRooms(data || []);
  };

  const fetchMessages = async (roomId: string) => {
    const { data: messagesData } = await supabase
      .from("chat_room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (!messagesData) {
      setMessages([]);
      return;
    }

    const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const messagesWithSenders = messagesData.map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id) || null,
    }));

    setMessages(messagesWithSenders);
  };

  const createRoom = async () => {
    if (!userId || !newRoom.name.trim()) {
      toast.error("Please enter a room name");
      return;
    }

    try {
      const { error } = await supabase.from("chat_rooms").insert({
        name: newRoom.name,
        description: newRoom.description || null,
        created_by: userId,
        is_private: false,
      });

      if (error) throw error;

      toast.success("Room created successfully");
      setNewRoom({ name: "", description: "" });
      setIsDialogOpen(false);
      fetchRooms();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingAudioUrl && !imageFile && !pendingLocation) || !selectedRoom || !userId) return;

    let imageUrl = null;
    let messageContent = newMessage.trim();

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(`chat/${fileName}`, imageFile);

      if (uploadError) {
        toast.error("Failed to upload image");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(uploadData.path);
      
      imageUrl = publicUrl;
    }

    // Format location as a special message
    if (pendingLocation) {
      messageContent = `📍 Location: ${pendingLocation.lat.toFixed(6)},${pendingLocation.lng.toFixed(6)}${pendingLocation.address ? ` - ${pendingLocation.address}` : ""}`;
    }

    try {
      const { error } = await supabase.from("chat_room_messages").insert({
        room_id: selectedRoom.id,
        sender_id: userId,
        content: messageContent || (pendingAudioUrl ? "🎤 Voice note" : "📷 Image"),
        image_url: imageUrl,
        audio_url: pendingAudioUrl,
      });

      if (error) throw error;

      setNewMessage("");
      setImageFile(null);
      setPendingAudioUrl(null);
      setPendingLocation(null);
      
      // Stop typing indicator
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: userId,
          username: username,
          typing: false,
        });
      }
    } catch (error: any) {
      toast.error("Failed to send message");
    }
  };

  const parseLocationFromMessage = (content: string): { lat: number; lng: number; address?: string } | null => {
    const match = content.match(/📍 Location: ([-\d.]+),([-\d.]+)(?: - (.+))?$/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2]),
        address: match[3],
      };
    }
    return null;
  };

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Chat Rooms</h1>
            <p className="text-muted-foreground mt-2">Real-time group discussions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/meeting")}>
              <Video className="mr-2 h-4 w-4" />
              Video Meeting
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="accent-glow">
                  <Plus className="mr-2 h-4 w-4" />
                  New Room
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Room Name *</Label>
                    <Input
                      id="name"
                      value={newRoom.name}
                      onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                      placeholder="e.g., General, Brainstorming"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newRoom.description}
                      onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                      placeholder="What's this room about?"
                      rows={3}
                    />
                  </div>
                  <Button onClick={createRoom} className="w-full">Create Room</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)]">
          {/* Room List */}
          <Card className="elegant-shadow border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-20rem)]">
                {rooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border/50 ${
                      selectedRoom?.id === room.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{room.name}</p>
                      {room.description && (
                        <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No rooms yet. Create one!
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-3 elegant-shadow border-border/50 flex flex-col">
            {selectedRoom ? (
              <>
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{selectedRoom.name}</CardTitle>
                      {selectedRoom.description && (
                        <p className="text-sm text-muted-foreground">{selectedRoom.description}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map(msg => {
                        const isOwn = msg.sender_id === userId;
                        const locationData = parseLocationFromMessage(msg.content);
                        return (
                          <div key={msg.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={msg.sender?.avatar_url || undefined} />
                              <AvatarFallback>
                                {msg.sender?.username?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{msg.sender?.username}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(msg.created_at), "h:mm a")}
                                </span>
                              </div>
                              <div
                                className={`rounded-lg p-3 ${
                                  isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}
                              >
                                {msg.audio_url ? (
                                  <AudioPlayer src={msg.audio_url} />
                                ) : locationData ? (
                                  <LocationMessage {...locationData} />
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
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  <TypingIndicator typingUsers={typingUsers} />
                  
                  <div className="p-4 border-t border-border/50">
                    {(imageFile || pendingAudioUrl || pendingLocation) && (
                      <div className="mb-2 p-2 bg-muted rounded flex items-center gap-2">
                        {imageFile && (
                          <>
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-sm truncate">{imageFile.name}</span>
                            <Button size="sm" variant="ghost" onClick={() => setImageFile(null)}>×</Button>
                          </>
                        )}
                        {pendingAudioUrl && (
                          <>
                            <AudioPlayer src={pendingAudioUrl} className="flex-1" />
                            <Button size="sm" variant="ghost" onClick={() => setPendingAudioUrl(null)}>×</Button>
                          </>
                        )}
                        {pendingLocation && (
                          <>
                            <MapPin className="h-4 w-4 text-accent" />
                            <span className="text-sm truncate">
                              {pendingLocation.address || `${pendingLocation.lat.toFixed(4)}, ${pendingLocation.lng.toFixed(4)}`}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => setPendingLocation(null)}>×</Button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
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
                      <LocationSharing 
                        onLocationShare={(loc) => setPendingLocation(loc)}
                        disabled={!selectedRoom}
                      />
                      <Input
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="flex-1"
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
                <div className="text-center">
                  <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a room to start chatting</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ChatRooms;