import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, Clock } from "lucide-react";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  order_index: number;
  is_completed: boolean;
  created_by: string | null;
}

interface MeetingAgendaProps {
  meetingId: string;
  userId: string;
  isOrganizer: boolean;
}

const MeetingAgenda = ({ meetingId, userId, isOrganizer }: MeetingAgendaProps) => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [newItem, setNewItem] = useState({ title: "", description: "", duration_minutes: 5 });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchAgendaItems();
  }, [meetingId]);

  const fetchAgendaItems = async () => {
    const { data, error } = await supabase
      .from("meeting_agenda_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching agenda:", error);
      return;
    }

    setItems(data || []);
  };

  const addAgendaItem = async () => {
    if (!newItem.title.trim()) {
      toast.error("Please enter an agenda item title");
      return;
    }

    const { error } = await supabase.from("meeting_agenda_items").insert({
      meeting_id: meetingId,
      title: newItem.title,
      description: newItem.description || null,
      duration_minutes: newItem.duration_minutes,
      order_index: items.length,
      created_by: userId,
    });

    if (error) {
      toast.error("Failed to add agenda item");
      return;
    }

    toast.success("Agenda item added");
    setNewItem({ title: "", description: "", duration_minutes: 5 });
    setIsAdding(false);
    fetchAgendaItems();
  };

  const toggleComplete = async (item: AgendaItem) => {
    const { error } = await supabase
      .from("meeting_agenda_items")
      .update({ is_completed: !item.is_completed })
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to update item");
      return;
    }

    fetchAgendaItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from("meeting_agenda_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    toast.success("Item removed");
    fetchAgendaItems();
  };

  const totalDuration = items.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);

  return (
    <Card className="wood-grain border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-accent" />
            Meeting Agenda
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {totalDuration} min
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No agenda items yet
          </p>
        )}

        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              item.is_completed 
                ? "bg-muted/30 border-border/30" 
                : "bg-muted/50 border-border/50"
            }`}
          >
            <Checkbox
              checked={item.is_completed}
              onCheckedChange={() => toggleComplete(item)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {index + 1}.
                </span>
                <span className={`font-medium ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({item.duration_minutes} min)
                </span>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
            </div>
            {isOrganizer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {isAdding ? (
          <div className="space-y-3 p-3 rounded-lg border border-accent/50 bg-accent/10">
            <Input
              placeholder="Agenda item title *"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <Input
                type="number"
                min={1}
                max={120}
                value={newItem.duration_minutes}
                onChange={(e) => setNewItem({ ...newItem, duration_minutes: parseInt(e.target.value) || 5 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={addAgendaItem} size="sm">Add Item</Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          isOrganizer && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agenda Item
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default MeetingAgenda;
