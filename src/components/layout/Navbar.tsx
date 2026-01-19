import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/war-room-logo.png";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "@/components/theme/ThemeToggle";
import PushNotificationManager from "@/components/notifications/PushNotificationManager";
import { Search, Video, Shield, Calendar, TrendingUp } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Fetch user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (roleData) setUserRole(roleData.role);

        // Fetch avatar
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        if (profile) setAvatarUrl(profile.avatar_url);
      }
    };
    
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isModerator = userRole === "admin" || userRole === "moderator";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <nav className="wood-grain border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-smooth hover:opacity-80">
            <img src={logo} alt="War Room" className="w-10 h-10" />
            <span className="text-xl font-bold">War Room</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Link to="/threads">
                  <Button variant="ghost">Discussions</Button>
                </Link>
                <Link to="/chat-rooms">
                  <Button variant="ghost">Chat</Button>
                </Link>
                <Link to="/tasks">
                  <Button variant="ghost">Tasks</Button>
                </Link>
                <Link to="/calendar">
                  <Button variant="ghost" size="icon" title="Calendar">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/analytics">
                  <Button variant="ghost" size="icon" title="Analytics">
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/meeting">
                  <Button variant="ghost" size="icon" title="Video Meetings">
                    <Video className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/search">
                  <Button variant="ghost" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </Link>
                <PushNotificationManager />
                <ThemeToggle />
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer ring-2 ring-accent/20 hover:ring-accent/40 transition-smooth">
                      <AvatarImage src={avatarUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/messages")}>
                      Direct Messages
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/members")}>
                      Members
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/notifications")}>
                      All Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/forum-info")}>
                      Forum Rules & Info
                    </DropdownMenuItem>
                    {isModerator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")} className="text-accent">
                          <Shield className="h-4 w-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button>Enter War Room</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;