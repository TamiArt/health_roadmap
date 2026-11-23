import { createId, isValidRequiredText } from "./shared";

export type HealthEventKind =
  | "operation"
  | "fracture"
  | "injury"
  | "hospitalization"
  | "diagnosis"
  | "procedure"
  | "other";

export interface HealthEvent {
  id: string;
  date: string;
  kind: HealthEventKind;
  title: string;
  description: string;
  facility?: string;
}

export type MonitoringKind = "measurement" | "periodic-check";

export interface MonitoringReminder {
  enabled: boolean;
  leadDays: number;
  time: string;
}

export interface MonitoringMeasurement {
  id: string;
  date: string;
  value: number;
  unit: string;
}

export interface HealthMonitoringItem {
  id: string;
  name: string;
  kind: MonitoringKind;
  unit: string;
  intervalDays: number | null;
  nextDueDate: string;
  lastCheckedDate: string;
  notes: string;
  reminder: MonitoringReminder;
  measurements?: MonitoringMeasurement[];
}

export interface LabIndicatorValue {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceRange?: string;
}

export interface LabResultEntry {
  id: string;
  testId: string;
  testName: string;
  date: string;
  indicators: LabIndicatorValue[];
  document?: {
    id: string;
    name: string;
    mimeType: string;
    blob: Blob;
  };
  notes: string;
}

export interface FamilyReminder {
  enabled: boolean;
  leadDays: number;
  time: string;
}

export interface FamilyDate {
  id: string;
  date: string;
  title: string;
  emoji: string;
  recurringYearly: boolean;
  reminder: FamilyReminder;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00");
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
}

export function validateHealthEvent(input: Omit<HealthEvent, "id">): string | null {
  if (!isIsoDate(input.date)) return "Укажите корректную дату события.";
  if (!isValidRequiredText(input.title, 120)) return "Укажите название события (до 120 символов).";
  if (input.description.length > 1000 || (input.facility?.length ?? 0) > 160) {
    return "Проверьте длину описания или названия учреждения.";
  }
  return null;
}

export function validateMonitoringItem(input: Omit<HealthMonitoringItem, "id">): string | null {
  if (!isValidRequiredText(input.name, 100)) return "Укажите название показателя или проверки.";
  if (!isIsoDate(input.nextDueDate)) return "Укажите корректную дату следующей проверки.";
  if (input.lastCheckedDate && !isIsoDate(input.lastCheckedDate)) return "Проверьте дату последней проверки.";
  if (input.intervalDays !== null && (!Number.isInteger(input.intervalDays) || input.intervalDays < 1 || input.intervalDays > 3650)) {
    return "Интервал должен быть от 1 до 3650 дней.";
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.reminder.time)) return "Укажите время напоминания.";
  if (!Number.isInteger(input.reminder.leadDays) || input.reminder.leadDays < 0 || input.reminder.leadDays > 365) {
    return "Срок напоминания должен быть от 0 до 365 дней.";
  }
  return null;
}

export function validateLabResult(input: Omit<LabResultEntry, "id">): string | null {
  if (!isIsoDate(input.date)) return "Укажите корректную дату анализа.";
  if (!isValidRequiredText(input.testName, 120)) return "Укажите название анализа.";
  if (input.indicators.length === 0) return "Добавьте хотя бы один показатель.";
  if (input.indicators.some(item =>
    !isValidRequiredText(item.name, 100) || !Number.isFinite(item.value) ||
    !isValidRequiredText(item.unit, 24) || (item.referenceRange?.length ?? 0) > 60
  )) return "Проверьте названия, числовые значения, единицы измерения и референсные значения.";
  if (input.notes.length > 1000) return "Комментарий не должен превышать 1000 символов.";
  return null;
}

export function nextOccurrence(date: string, recurringYearly: boolean, now = new Date()): Date | null {
  if (!isIsoDate(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(now.getFullYear(), month - 1, day);
  candidate.setHours(0, 0, 0, 0);
  if (!recurringYearly) {
    const exact = new Date(year, month - 1, day);
    exact.setHours(0, 0, 0, 0);
    return exact >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) ? exact : null;
  }
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export function buildHealthEvent(input: Omit<HealthEvent, "id">): HealthEvent {
  return { ...input, id: createId() };
}
