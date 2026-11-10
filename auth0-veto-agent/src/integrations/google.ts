import { DEMO_GOOGLE_ACCESS_TOKEN, isDemoMode } from "../config.js";

export type CalendarEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  status?: string;
};

export async function listCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=5&singleEvents=true&orderBy=startTime";
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Calendar list failed (${response.status}): ${detail}`);
  }
  const body = (await response.json()) as { items?: CalendarEvent[] };
  return body.items ?? [];
}

export async function createCeoMeeting(accessToken: string): Promise<CalendarEvent> {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: "Meeting with the CEO",
        description: "Created by the Veto Agent after CIBA approval.",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Calendar create failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as CalendarEvent;
}

export async function countUnreadEmails(accessToken: string): Promise<number> {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    if (isDemoMode || accessToken === DEMO_GOOGLE_ACCESS_TOKEN) return 12;
    const detail = await response.text();
    throw new Error(`Gmail list failed (${response.status}): ${detail}`);
  }
  const body = (await response.json()) as { resultSizeEstimate?: number };
  return body.resultSizeEstimate ?? 0;
}
