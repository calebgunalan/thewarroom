import { format } from "date-fns";

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
}

// Format date for iCalendar (YYYYMMDDTHHMMSSZ)
const formatICSDate = (date: Date): string => {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
};

// Generate a unique ID for the event
const generateUID = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@warroom`;
};

// Escape special characters in ICS text
const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

// Generate ICS content for a single event
const generateICSEvent = (event: CalendarEvent): string => {
  const startDate = formatICSDate(event.startDate);
  const endDate = event.endDate 
    ? formatICSDate(event.endDate) 
    : formatICSDate(new Date(event.startDate.getTime() + 60 * 60 * 1000)); // Default 1 hour

  let icsEvent = `BEGIN:VEVENT
UID:${generateUID()}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${escapeICSText(event.title)}`;

  if (event.description) {
    icsEvent += `\nDESCRIPTION:${escapeICSText(event.description)}`;
  }

  if (event.location) {
    icsEvent += `\nLOCATION:${escapeICSText(event.location)}`;
  }

  icsEvent += `\nEND:VEVENT`;

  return icsEvent;
};

// Generate full ICS file content
export const generateICSFile = (events: CalendarEvent[]): string => {
  const header = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//War Room//Calendar Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:War Room Calendar`;

  const footer = `\nEND:VCALENDAR`;

  const eventStrings = events.map(generateICSEvent).join("\n");

  return `${header}\n${eventStrings}${footer}`;
};

// Download ICS file
export const downloadICSFile = (events: CalendarEvent[], filename: string = "war-room-calendar.ics"): void => {
  const icsContent = generateICSFile(events);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export a single event
export const exportSingleEvent = (event: CalendarEvent, filename?: string): void => {
  const safeFilename = filename || `${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
  downloadICSFile([event], safeFilename);
};
