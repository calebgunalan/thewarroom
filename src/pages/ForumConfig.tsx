import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import { Target, BookOpen, Shield } from "lucide-react";
import logo from "@/assets/war-room-logo.png";

interface ForumConfig {
  id: string;
  forum_name: string | null;
  logo_url: string | null;
  common_goal: string | null;
  rules: string[] | null;
}

const ForumConfigPage = () => {
  const [config, setConfig] = useState<ForumConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("forum_config")
      .select("*")
      .limit(1)
      .single();
    
    setConfig(data);
    setLoading(false);
  };

  const defaultRules = [
    "Respect all members and their opinions",
    "Complete assigned tasks before deadlines",
    "Maintain confidentiality of discussions",
    "Participate actively in meetings",
    "Support fellow members in their goals",
    "Three missed task deadlines result in removal",
    "Vote honestly and constructively",
    "No spam or off-topic discussions"
  ];

  const defaultGoal = "To create a collaborative network of like-minded individuals who hold each other accountable, share knowledge, and work together toward collective success.";

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Logo */}
          <div className="text-center mb-12">
            <img 
              src={config?.logo_url || logo} 
              alt="War Room" 
              className="w-32 h-32 mx-auto mb-6 accent-glow"
            />
            <h1 className="text-5xl font-serif font-bold mb-4">
              {config?.forum_name || "War Room"}
            </h1>
            <p className="text-xl text-muted-foreground">
              Elite Discussion Forum & Accountability Network
            </p>
          </div>

          {/* Common Goal */}
          <Card className="elegant-shadow mb-8 border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Target className="h-6 w-6 text-accent" />
                Our Common Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed text-foreground/90">
                {config?.common_goal || defaultGoal}
              </p>
            </CardContent>
          </Card>

          {/* Rules */}
          <Card className="elegant-shadow mb-8 border-accent/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <BookOpen className="h-6 w-6 text-accent" />
                Forum Rules & Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(config?.rules || defaultRules).map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {index + 1}
                    </Badge>
                    <p className="text-foreground/90">{rule}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accountability System */}
          <Card className="elegant-shadow border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Shield className="h-6 w-6 text-destructive" />
                Accountability System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <h3 className="font-semibold text-lg mb-2">Three-Strike Policy</h3>
                  <p className="text-muted-foreground mb-4">
                    Members who fail to complete their assigned tasks for three consecutive meetings 
                    will be automatically removed from the War Room. This ensures that all members 
                    remain committed and accountable.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="destructive">Strike 1: Warning</Badge>
                    <Badge variant="destructive">Strike 2: Final Warning</Badge>
                    <Badge variant="destructive">Strike 3: Removal</Badge>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <h4 className="font-semibold mb-2">Reputation Points</h4>
                    <p className="text-sm text-muted-foreground">
                      Earn points by completing tasks, contributing to discussions, 
                      and receiving upvotes from peers.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30">
                    <h4 className="font-semibold mb-2">Progress Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      All members can view each other's progress, task completion rates, 
                      and contribution history.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ForumConfigPage;
