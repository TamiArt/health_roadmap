import { useCallback, useEffect, useMemo, useState } from "react";
import { getStorageScope, usePersistentState } from "./storage";
import { useBrowserReminders } from "./useBrowserReminders";
import type { Child } from "./data";
import type { CalendarPlanEvent } from "./calendarModel";

function ChildReminderSource({ child, onEvents }: { child: Child; onEvents: (id: string, events: CalendarPlanEvent[]) => void }) {
  const [events] = usePersistentState<CalendarPlanEvent[]>(`childHealth:${child.id}:calendarEvents`, []);
  useEffect(() => onEvents(child.id, events), [child.id, events, onEvents]);
  return null;
}

/** Runs for the entire authenticated workspace, even when the calendar page is not open. */
export function CalendarReminderService() {
  const [adultEvents] = usePersistentState<CalendarPlanEvent[]>("calendarEvents", []);
  const [children] = usePersistentState<Child[]>("children", []);
  const [childEvents, setChildEvents] = useState<Record<string, CalendarPlanEvent[]>>({});
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

  const receiveChildEvents = useCallback((id: string, events: CalendarPlanEvent[]) => {
    setChildEvents(previous => previous[id] === events ? previous : { ...previous, [id]: events });
  }, []);
  const scope = getStorageScope();
  const reminders = useMemo(() => [
    ...adultEvents.map(event => ({ ...event, reminderId: `${scope}:adult:${event.id}` })),
    ...children.flatMap(child => (childEvents[child.id] ?? []).map(event => ({
      ...event, reminderId: `${scope}:child:${child.id}:${event.id}`,
    }))),
  ].map(event => ({
    id: event.reminderId, title: event.title, date: event.date,
    enabled: event.reminder.enabled && event.status === "planned",
    leadDays: event.reminder.leadDays, time: event.reminder.time,
    notificationTitle: "Напоминание календаря",
  })), [adultEvents, children, childEvents, scope]);

  useEffect(() => {
    const resetProfileCache = () => setChildEvents({});
    window.addEventListener("life-maps:storage-scope", resetProfileCache);
    window.addEventListener("storage", resetProfileCache);
    return () => {
      window.removeEventListener("life-maps:storage-scope", resetProfileCache);
      window.removeEventListener("storage", resetProfileCache);
    };
  }, []);

  useEffect(() => {
    const refreshPermission = () => setPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
    window.addEventListener("life-maps:notification-permission", refreshPermission);
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    return () => {
      window.removeEventListener("life-maps:notification-permission", refreshPermission);
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  useBrowserReminders(reminders, permission === "granted");
  return <>{children.map(child => <ChildReminderSource key={child.id} child={child} onEvents={receiveChildEvents} />)}</>;
}
