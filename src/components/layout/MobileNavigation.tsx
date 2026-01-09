import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, CheckSquare, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MobileNavigation = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isLoggedIn) return null;

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { path: "/threads", icon: MessageSquare, label: "Discuss" },
    { path: "/chat-rooms", icon: Home, label: "Chat" },
    { path: "/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/members", icon: Users, label: "Members" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden wood-grain border-t border-border/50">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-smooth",
                isActive 
                  ? "text-accent bg-accent/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-accent")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
