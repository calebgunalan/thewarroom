import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/layout/Navbar";
import { toast } from "sonner";
import { Shield, Users, FileText, Settings, AlertTriangle, BarChart } from "lucide-react";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminReports from "@/components/admin/AdminReports";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role === "admin" || roleData?.role === "moderator") {
      setIsAdmin(true);
    } else {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen wood-grain flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen wood-grain">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-10 w-10 text-accent" />
          <div>
            <h1 className="text-4xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users, content, and forum settings</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReports />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;