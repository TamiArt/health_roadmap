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
  notificationTitle?: string;
}

const SENT_KEY = "life-maps:sent-browser-reminders";

/** Browser notifications are checked while the app is open; this is not a push service. */
export function useBrowserReminders(reminders: BrowserReminder[], enabled: boolean) {
  const sent = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const stored = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) sent.current = new Set(stored.filter((value): value is string => typeof value === "string"));
    } catch {
      sent.current = new Set();
    }

    const check = () => {
      const now = new Date();
      const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      reminders.forEach(reminder => {
        if (!reminder.enabled || clock < reminder.time) return;
        const occurrence = nextOccurrence(reminder.date, Boolean(reminder.recurringYearly), now);
        if (!occurrence) return;
        const days = Math.round((new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate()).getTime() -
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
        if (days < 0 || days > reminder.leadDays) return;
        const key = `${reminder.id}:${occurrence.getFullYear()}-${occurrence.getMonth() + 1}-${occurrence.getDate()}`;
        if (sent.current.has(key)) return;
        try {
          new Notification(reminder.notificationTitle ?? "Напоминание", {
            body: days === 0 ? `${reminder.title}: событие запланировано на сегодня.` :
              `${reminder.title}: событие через ${days} дн.`,
            tag: key,
          });
          sent.current.add(key);
          try { localStorage.setItem(SENT_KEY, JSON.stringify([...sent.current].slice(-500))); } catch { /* In-memory deduplication remains active for this session. */ }
        } catch {
          // Browser or operating-system notification delivery may be unavailable.
        }
      });
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [reminders, enabled]);
}
