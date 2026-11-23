import { useEffect, useRef } from "react";
import { nextOccurrence } from "./healthRecords";

export interface BrowserReminder {
  id: string;
  title: string;
  date: string;
  enabled: boolean;
  leadDays: number;
  time: string;
  recurringYearly?: boolean;
}

/** Browser notifications are checked while the app is open; this is not a push service. */
export function useBrowserReminders(reminders: BrowserReminder[], enabled: boolean) {
  const sent = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const check = () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      reminders.forEach(reminder => {
        if (!reminder.enabled || time < reminder.time) return;
        const occurrence = nextOccurrence(reminder.date, Boolean(reminder.recurringYearly), now);
        if (!occurrence) return;
        const days = Math.round((new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
        if (days < 0 || days > reminder.leadDays) return;
        const key = `${reminder.id}:${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        if (sent.current.has(key)) return;
        new Notification("Напоминание", { body: days === 0 ? `${reminder.title}: сегодня` : `${reminder.title}: через ${days} дн.` });
        sent.current.add(key);
      });
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [reminders, enabled]);
}
