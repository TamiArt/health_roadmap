import { createId, isValidRequiredText } from "./shared";
import { isIsoDate } from "./healthRecords";

export type CalendarEventType = "appointment" | "examination" | "lab" | "vaccination" | "medication" | "treatment" | "other";
export type CalendarEventStatus = "planned" | "completed" | "cancelled";
export type CalendarLinkType = "health" | "lab" | "vaccine" | "monitoring";

export interface CalendarPlanEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  endDate: string;
  time: string;
  status: CalendarEventStatus;
  facility: string;
  details: string;
  reminder: { enabled: boolean; leadDays: number; time: string };
  link?: { type: CalendarLinkType; id: string; label: string };
  createdAt: string;
  updatedAt: string;
}

export const CALENDAR_EVENT_TYPES: Record<CalendarEventType, string> = {
  appointment: "Приём врача",
  examination: "Обследование",
  lab: "Плановый анализ",
  vaccination: "Вакцинация",
  medication: "Лекарство",
  treatment: "Курс лечения",
  other: "Другое событие",
};

export const CALENDAR_EVENT_STATUSES: Record<CalendarEventStatus, string> = {
  planned: "Запланировано",
  completed: "Выполнено",
  cancelled: "Отменено",
};

export function validateCalendarEvent(input: Omit<CalendarPlanEvent, "id" | "createdAt" | "updatedAt">): string | null {
  if (!isValidRequiredText(input.title, 120)) return "Укажите название события (до 120 символов).";
  if (!isIsoDate(input.date)) return "Укажите корректную дату события.";
  if (input.endDate && (!isIsoDate(input.endDate) || input.endDate < input.date)) return "Дата окончания не может быть раньше даты начала.";
  if (input.time && !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(input.time)) return "Проверьте время события.";
  if (input.facility.length > 160 || input.details.length > 1500) return "Проверьте длину места проведения или описания.";
  if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(input.reminder.time)) return "Укажите корректное время напоминания.";
  if (!Number.isInteger(input.reminder.leadDays) || input.reminder.leadDays < 0 || input.reminder.leadDays > 365) return "Срок напоминания должен быть от 0 до 365 дней.";
  if (input.link && (!input.link.id || !input.link.label)) return "Проверьте связь с медицинской записью.";
  return null;
}

export function createCalendarEvent(input: Omit<CalendarPlanEvent, "id" | "createdAt" | "updatedAt">, now = new Date()): CalendarPlanEvent {
  const error = validateCalendarEvent(input);
  if (error) throw new Error(error);
  const timestamp = now.toISOString();
  return { ...input, id: createId(), createdAt: timestamp, updatedAt: timestamp };
}

export function sortCalendarEvents(events: CalendarPlanEvent[]): CalendarPlanEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}
