import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";

export interface RecurrenceSettings {
  enabled: boolean;
  type: "daily" | "weekly" | "monthly";
  interval: number;
  endDate: Date | null;
}

interface RecurringMeetingFormProps {
  settings: RecurrenceSettings;
  onChange: (settings: RecurrenceSettings) => void;
}

const RecurringMeetingForm = ({ settings, onChange }: RecurringMeetingFormProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleToggle = (enabled: boolean) => {
    onChange({ ...settings, enabled });
  };

  const handleTypeChange = (type: "daily" | "weekly" | "monthly") => {
    onChange({ ...settings, type });
  };

  const handleIntervalChange = (interval: number) => {
    onChange({ ...settings, interval: Math.max(1, interval) });
  };

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({ ...settings, endDate: date || null });
    setCalendarOpen(false);
  };

  const getIntervalLabel = () => {
    switch (settings.type) {
      case "daily": return settings.interval === 1 ? "day" : "days";
      case "weekly": return settings.interval === 1 ? "week" : "weeks";
      case "monthly": return settings.interval === 1 ? "month" : "months";
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-secondary/30 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-accent" />
          <Label htmlFor="recurring">Recurring Meeting</Label>
        </div>
        <Switch
          id="recurring"
          checked={settings.enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {settings.enabled && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select value={settings.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{getIntervalLabel()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>End Date (optional)</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {settings.endDate ? format(settings.endDate, "PPP") : "No end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settings.endDate || undefined}
                  onSelect={handleEndDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-xs text-muted-foreground">
            Meeting will repeat every {settings.interval} {getIntervalLabel()}
            {settings.endDate && ` until ${format(settings.endDate, "PPP")}`}.
            Recurring instances will be automatically generated.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecurringMeetingForm;
