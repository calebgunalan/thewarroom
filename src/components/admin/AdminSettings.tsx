import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Plus, X, Save, Upload } from "lucide-react";

interface ForumConfig {
  id: string;
  forum_name: string | null;
  logo_url: string | null;
  common_goal: string | null;
  rules: string[] | null;
}

const AdminSettings = () => {
  const [config, setConfig] = useState<ForumConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    forum_name: "",
    common_goal: "",
    rules: [""],
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase
      .from("forum_config")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setConfig(data);
      setFormData({
        forum_name: data.forum_name || "",
        common_goal: data.common_goal || "",
        rules: data.rules || [""],
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const filteredRules = formData.rules.filter((rule) => rule.trim() !== "");

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from("forum_config")
          .update({
            forum_name: formData.forum_name,
            common_goal: formData.common_goal,
            rules: filteredRules,
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase.from("forum_config").insert({
          forum_name: formData.forum_name,
          common_goal: formData.common_goal,
          rules: filteredRules,
        });

        if (error) throw error;
      }

      toast.success("Forum settings saved");
      fetchConfig();
    } catch (error: any) {
      toast.error(error.message);
    }
    setSaving(false);
  };

  const addRule = () => {
    setFormData({ ...formData, rules: [...formData.rules, ""] });
  };

  const removeRule = (index: number) => {
    const newRules = formData.rules.filter((_, i) => i !== index);
    setFormData({ ...formData, rules: newRules.length ? newRules : [""] });
  };

  const updateRule = (index: number, value: string) => {
    const newRules = [...formData.rules];
    newRules[index] = value;
    setFormData({ ...formData, rules: newRules });
  };

  if (loading) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="elegant-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Forum Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Forum Name */}
          <div className="space-y-2">
            <Label htmlFor="forum_name">Forum Name</Label>
            <Input
              id="forum_name"
              value={formData.forum_name}
              onChange={(e) =>
                setFormData({ ...formData, forum_name: e.target.value })
              }
              placeholder="War Room"
            />
          </div>

          {/* Common Goal */}
          <div className="space-y-2">
            <Label htmlFor="common_goal">Common Goal / Mission Statement</Label>
            <Textarea
              id="common_goal"
              value={formData.common_goal}
              onChange={(e) =>
                setFormData({ ...formData, common_goal: e.target.value })
              }
              placeholder="Our mission is to..."
              rows={4}
            />
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Forum Rules & Guidelines</Label>
              <Button variant="outline" size="sm" onClick={addRule}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>
            <div className="space-y-2">
              {formData.rules.map((rule, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex items-center justify-center w-8 h-10 rounded bg-secondary text-sm font-medium">
                    {index + 1}
                  </div>
                  <Input
                    value={rule}
                    onChange={(e) => updateRule(index, e.target.value)}
                    placeholder={`Rule ${index + 1}...`}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    disabled={formData.rules.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="elegant-shadow border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10">
            <h4 className="font-medium mb-2">Clear All Strikes</h4>
            <p className="text-sm text-muted-foreground mb-3">
              This will remove all strikes from all users. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (confirm("Are you sure? This cannot be undone.")) {
                  // Note: This would need admin RLS policy on strikes for DELETE
                  toast.info("Feature requires additional database permissions");
                }
              }}
            >
              Clear All Strikes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;