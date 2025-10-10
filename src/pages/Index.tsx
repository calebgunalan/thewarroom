import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import { User } from "@supabase/supabase-js";
import { Shield, Target, Users, TrendingUp, Award, CheckCircle } from "lucide-react";
import logo from "@/assets/war-room-logo.png";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
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

  const features = [
    {
      icon: Target,
      title: "Strategic Discussions",
      description: "Engage in meaningful conversations about future initiatives, current progress, and past achievements"
    },
    {
      icon: Users,
      title: "Collaborative Network",
      description: "Connect with like-minded individuals who share your drive for excellence and accountability"
    },
    {
      icon: TrendingUp,
      title: "Task Management",
      description: "Track assigned missions, deadlines, and maintain accountability through structured follow-ups"
    },
    {
      icon: Award,
      title: "Voting System",
      description: "Democratic decision-making through community voting on ideas, proposals, and viewpoints"
    },
    {
      icon: Shield,
      title: "Accountability",
      description: "Three-strike system ensures commitment and active participation from all members"
    },
    {
      icon: CheckCircle,
      title: "Progress Tracking",
      description: "Monitor individual and collective progress toward shared goals and milestones"
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
          <h1 className="text-6xl font-bold mb-6">Welcome to the War Room</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            An elite discussion forum where ambition meets accountability. 
            Collaborate, strategize, and achieve collective excellence through structured engagement.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="accent-glow">
              Join the Council
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Return to Base
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-center mb-12">Core Capabilities</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <Card key={idx} className="elegant-shadow hover:shadow-lg transition-smooth">
              <CardContent className="pt-6">
                <feature.icon className="h-12 w-12 mb-4 text-accent" />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
    </div>
  );
};

export default Index;
