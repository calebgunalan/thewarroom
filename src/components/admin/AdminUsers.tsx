import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserCog, AlertTriangle, Shield, User, Ban } from "lucide-react";

interface UserWithRole {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
  role: string;
  strike_count: number;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [isStrikeDialogOpen, setIsStrikeDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Fetch profiles with roles and strike counts
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profiles) {
      setLoading(false);
      return;
    }

    // Fetch roles for all users
    const { data: roles } = await supabase.from("user_roles").select("*");

    // Fetch strike counts
    const { data: strikes } = await supabase.from("strikes").select("user_id");

    const usersWithData = profiles.map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.id);
      const userStrikes = strikes?.filter((s) => s.user_id === profile.id) || [];
      return {
        ...profile,
        role: userRole?.role || "member",
        strike_count: userStrikes.length,
      };
    });

    setUsers(usersWithData);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: "admin" | "moderator" | "member") => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("User role updated");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User ${status === "active" ? "activated" : "deactivated"}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const issueStrike = async () => {
    if (!selectedUser || !strikeReason) {
      toast.error("Please provide a reason");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("strikes").insert({
        user_id: selectedUser.id,
        reason: strikeReason,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Strike issued");
      setIsStrikeDialogOpen(false);
      setStrikeReason("");
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "text-green-500";
      case "removed":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Management ({users.length} members)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      <span className={`text-sm ${getStatusColor(user.status)}`}>
                        ({user.status || "active"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>Strikes: {user.strike_count}/3</span>
                      {user.strike_count > 0 && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value: "admin" | "moderator" | "member") => updateUserRole(user.id, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Dialog open={isStrikeDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setIsStrikeDialogOpen(open);
                    if (open) setSelectedUser(user);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Strike
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Issue Strike to {user.username}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Reason</Label>
                          <Textarea
                            value={strikeReason}
                            onChange={(e) => setStrikeReason(e.target.value)}
                            placeholder="Reason for issuing strike..."
                            rows={3}
                          />
                        </div>
                        <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                          <p className="font-medium text-destructive">Warning</p>
                          <p className="text-muted-foreground">
                            User currently has {user.strike_count} strike(s). 
                            At 3 strikes, they will be automatically removed.
                          </p>
                        </div>
                        <Button onClick={issueStrike} variant="destructive" className="w-full">
                          Issue Strike
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {user.status === "active" ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateUserStatus(user.id, "removed")}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => updateUserStatus(user.id, "active")}
                    >
                      <User className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;