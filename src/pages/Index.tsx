import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import { User } from "@supabase/supabase-js";
import { Shield, Target, Users, TrendingUp, Award, CheckCircle, Calendar, MessageSquare, Video } from "lucide-react";
import logo from "@/assets/war-room-logo.png";
import heroBackground from "@/assets/hero-background.jpg";

interface ForumConfig {
  forum_name: string | null;
  common_goal: string | null;
  rules: string[] | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [forumConfig, setForumConfig] = useState<ForumConfig | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [threadCount, setThreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStats = async () => {
    // Fetch forum config
    const { data: configData } = await supabase
      .from("forum_config")
      .select("*")
      .single();
    
    if (configData) setForumConfig(configData);

    // Fetch counts
    const [membersRes, threadsRes, tasksRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).neq("status", "removed"),
      supabase.from("threads").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }).eq("status", "completed"),
    ]);

    setMemberCount(membersRes.count || 0);
    setThreadCount(threadsRes.count || 0);
    setTaskCount(tasksRes.count || 0);
  };

  const features = [
    {
      icon: Target,
      title: "Strategic Discussions",
      description: "Engage in meaningful conversations about future initiatives and progress"
    },
    {
      icon: Users,
      title: "Collaborative Network",
      description: "Connect with like-minded individuals who share your drive for excellence"
    },
    {
      icon: TrendingUp,
      title: "Task Management",
      description: "Track missions, deadlines, and maintain accountability"
    },
    {
      icon: Award,
      title: "Voting & Reputation",
      description: "Democratic decision-making with community voting and leaderboards"
    },
    {
      icon: Shield,
      title: "Accountability System",
      description: "Three-strike system ensures commitment from all members"
    },
    {
      icon: Calendar,
      title: "Calendar & Meetings",
      description: "Schedule meetings and track all events in one place"
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant messaging with voice notes and media sharing"
    },
    {
      icon: Video,
      title: "Video Conferencing",
      description: "Launch live video meetings directly in the app"
    }
  ];

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url(${heroBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <div className="relative container mx-auto px-4 py-24 text-center">
          <img src={logo} alt="War Room" className="w-32 h-32 mx-auto mb-8 accent-glow" />
          <h1 className="text-6xl font-bold mb-6">
            {forumConfig?.forum_name || "Welcome to the War Room"}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {forumConfig?.common_goal || 
              "An elite discussion forum where ambition meets accountability. Collaborate, strategize, and achieve collective excellence."
            }
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")} className="accent-glow">
              Join the Council
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-primary/10 border-y border-border/50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent">{memberCount}</div>
              <p className="text-muted-foreground">Active Members</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent">{threadCount}</div>
              <p className="text-muted-foreground">Discussions</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent">{taskCount}</div>
              <p className="text-muted-foreground">Tasks Completed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-4">Core Capabilities</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Everything you need to collaborate effectively, stay accountable, and achieve your goals together.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <Card key={idx} className="elegant-shadow hover:shadow-lg transition-smooth hover:scale-105">
              <CardContent className="pt-6">
                <feature.icon className="h-10 w-10 mb-4 text-accent" />
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Rules Section */}
      {forumConfig?.rules && forumConfig.rules.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <Card className="elegant-shadow">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-6 text-center">Community Guidelines</h2>
              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {forumConfig.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Mission Statement */}
      <section className="container mx-auto px-4 py-16">
        <Card className="elegant-shadow bg-gradient-to-br from-primary/20 to-accent/10 border-accent/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              To create a decentralized forum where accountability drives excellence, 
              networking fuels growth, and structured collaboration transforms ambition into achievement.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge variant="outline" className="text-lg py-2 px-4">Accountability</Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">Excellence</Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">Collaboration</Badge>
              <Badge variant="outline" className="text-lg py-2 px-4">Growth</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Join the Elite?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Take your seat at the table. The War Room awaits.
        </p>
        <Button size="lg" onClick={() => navigate("/auth")} className="accent-glow">
          Enter War Room
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} War Room. Built for accountability and excellence.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
