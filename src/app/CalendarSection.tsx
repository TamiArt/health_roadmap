import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FlaskConical, HeartPulse, Users } from "lucide-react";
import { usePersistentState } from "./storage";
import type { Child, LabMeasurement } from "./data";
import { LIFE_STAGES } from "./data";
import type { FamilyDate, HealthEvent, HealthMonitoringItem, LabResultEntry } from "./healthRecords";
import { isIsoDate } from "./healthRecords";
import { CalendarEventManager } from "./CalendarEventManager";
import { CALENDAR_EVENT_STATUSES, CALENDAR_EVENT_TYPES, type CalendarPlanEvent } from "./calendarModel";
import { useBrowserReminders } from "./useBrowserReminders";

type CalendarSource = "health" | "monitoring" | "labs" | "family" | "planned";
type CalendarItem = { id: string; date: string; title: string; details?: string; source: CalendarSource; person?: string };
type ChildCalendarData = { events: HealthEvent[]; monitoring: HealthMonitoringItem[]; labs: LabResultEntry[]; planned: CalendarPlanEvent[] };

const SOURCE_META: Record<CalendarSource, { label: string; color: string; Icon: typeof HeartPulse }> = {
  health: { label: "Здоровье", color: "bg-rose-100 text-rose-700", Icon: HeartPulse },
  monitoring: { label: "На контроле", color: "bg-amber-100 text-amber-800", Icon: ClipboardCheck },
  labs: { label: "Анализы", color: "bg-sky-100 text-sky-700", Icon: FlaskConical },
  family: { label: "Семья", color: "bg-violet-100 text-violet-700", Icon: Users },
  planned: { label: "Планы", color: "bg-emerald-100 text-emerald-700", Icon: CalendarClock },
};

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}
function familyDateInYear(event: FamilyDate, year: number): string | null {
  if (!event.recurringYearly) return event.date;
  const [, month, day] = event.date.split("-").map(Number);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1) candidate.setDate(0);
  return isoDate(candidate);
}
function plannedDetails(event: CalendarPlanEvent): string {
  return [CALENDAR_EVENT_TYPES[event.type], CALENDAR_EVENT_STATUSES[event.status], event.time, event.facility,
    event.endDate ? `Курс до ${event.endDate}` : "", event.reminder.enabled && event.status === "planned" ? "Напоминание включено" : "",
    event.link ? `Связано: ${event.link.label}` : ""].filter(Boolean).join(" · ");
}

function ChildCalendarSource({ child, onData }: { child: Child; onData: (id: string, data: ChildCalendarData) => void }) {
  const [events] = usePersistentState<HealthEvent[]>(`childHealth:${child.id}:healthEvents`, []);
  const [monitoring] = usePersistentState<HealthMonitoringItem[]>(`childHealth:${child.id}:healthMonitoring`, []);
  const [labs] = usePersistentState<LabResultEntry[]>(`childHealth:${child.id}:labResultEntries`, []);
  const [planned] = usePersistentState<CalendarPlanEvent[]>(`childHealth:${child.id}:calendarEvents`, []);
  useEffect(() => onData(child.id, { events, monitoring, labs, planned }), [child.id, events, monitoring, labs, planned, onData]);
  return null;
}

export function CalendarSection({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const [healthEvents] = usePersistentState<HealthEvent[]>("healthEvents", []);
  const [monitoring] = usePersistentState<HealthMonitoringItem[]>("healthMonitoring", []);
  const [labResults] = usePersistentState<LabResultEntry[]>("labResultEntries", []);
  const [catalogMeasurements] = usePersistentState<Record<string, LabMeasurement[]>>("labMeasurements", {});
  const [familyDates] = usePersistentState<FamilyDate[]>("familyEvents", []);
  const [plannedEvents] = usePersistentState<CalendarPlanEvent[]>("calendarEvents", []);
  const [children] = usePersistentState<Child[]>("children", []);
  const [childData, setChildData] = useState<Record<string, ChildCalendarData>>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeSources, setActiveSources] = useState<CalendarSource[]>(["health", "monitoring", "labs", "family", "planned"]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState("adult");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");

  const receiveChildData = useCallback((id: string, data: ChildCalendarData) => {
    setChildData(previous => {
      const current = previous[id];
      if (current && current.events === data.events && current.monitoring === data.monitoring &&
        current.labs === data.labs && current.planned === data.planned) return previous;
      return { ...previous, [id]: data };
    });
  }, []);

  const allPlanned = useMemo(() => [
    ...plannedEvents.map(event => ({ ...event, reminderId: `adult:${event.id}` })),
    ...children.flatMap(child => (childData[child.id]?.planned ?? []).map(event => ({
      ...event, reminderId: `child:${child.id}:${event.id}`,
    }))),
  ], [plannedEvents, children, childData]);
  const reminders = useMemo(() => allPlanned.map(event => ({
    id: event.reminderId, title: event.title, date: event.date,
    enabled: event.reminder.enabled && event.status === "planned",
    leadDays: event.reminder.leadDays, time: event.reminder.time,
    notificationTitle: "Напоминание календаря",
  })), [allPlanned]);
  useBrowserReminders(reminders, permission === "granted");

  const now = new Date();
  const visibleMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const today = isoDate(now);

  const items = useMemo(() => {
    const result: CalendarItem[] = [];
    const addPlan = (event: CalendarPlanEvent, person?: string) => {
      result.push({ id: `planned:${person ?? "adult"}:${event.id}`, date: event.date, title: event.title,
        details: plannedDetails(event), source: "planned", person });
      if (event.endDate && event.endDate !== event.date) result.push({
        id: `planned-end:${person ?? "adult"}:${event.id}`, date: event.endDate,
        title: `Окончание курса: ${event.title}`, details: "Последний день запланированного курса",
        source: "planned", person,
      });
    };
    plannedEvents.forEach(event => addPlan(event));
    healthEvents.forEach(event => result.push({ id: `health:${event.id}`, date: event.date, title: event.title,
      details: event.description || undefined, source: "health" }));
    monitoring.forEach(item => {
      result.push({ id: `monitor:${item.id}`, date: item.nextDueDate, title: `Проверка: ${item.name}`,
        details: item.reminder.enabled ? "Напоминание включено" : "Контрольная дата", source: "monitoring" });
      (item.measurements ?? []).forEach(reading => result.push({ id: `monitor-reading:${item.id}:${reading.id}`,
        date: reading.date, title: `Измерение: ${item.name}`, details: `${reading.value}${reading.unit ? ` ${reading.unit}` : ""}`, source: "monitoring" }));
    });
    const testNames = new Map(LIFE_STAGES.flatMap(stage => stage.tests.map(test => [test.id, test.name] as const)));
    Object.entries(catalogMeasurements).forEach(([testId, measurements]) => measurements.forEach(measurement => result.push({
      id: `catalog-lab:${testId}:${measurement.id}`, date: measurement.date,
      title: testNames.get(testId) ?? "Результат анализа",
      details: `${measurement.value}${measurement.unit ? ` ${measurement.unit}` : ""}`, source: "labs",
    })));
    labResults.forEach(entry => result.push({ id: `lab:${entry.id}`, date: entry.date, title: entry.testName,
      details: entry.indicators.map(value => `${value.name}: ${value.value} ${value.unit}`).join(" · "), source: "labs" }));
    familyDates.forEach(event => {
      const date = familyDateInYear(event, year);
      if (date) result.push({ id: `family:${event.id}:${date}`, date, title: event.title,
        details: event.reminder?.enabled ? "Памятная дата · напоминание включено" : "Памятная дата", source: "family" });
    });
    children.forEach(child => {
      const data = childData[child.id];
      if (!data) return;
      data.planned.forEach(event => addPlan(event, child.name));
      data.events.forEach(event => result.push({ id: `child-health:${child.id}:${event.id}`, date: event.date,
        title: event.title, details: event.description || "Медицинское событие", source: "health", person: child.name }));
      data.monitoring.forEach(item => {
        result.push({ id: `child-monitor:${child.id}:${item.id}`, date: item.nextDueDate, title: `Проверка: ${item.name}`,
          details: "Контрольная дата", source: "monitoring", person: child.name });
        (item.measurements ?? []).forEach(reading => result.push({ id: `child-monitor-reading:${child.id}:${item.id}:${reading.id}`,
          date: reading.date, title: `Измерение: ${item.name}`, details: `${reading.value}${reading.unit ? ` ${reading.unit}` : ""}`,
          source: "monitoring", person: child.name }));
      });
      data.labs.forEach(entry => result.push({ id: `child-lab:${child.id}:${entry.id}`, date: entry.date,
        title: entry.testName, details: "Результат анализа", source: "labs", person: child.name }));
    });
    return result.filter(item => isIsoDate(item.date)).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [healthEvents, monitoring, labResults, catalogMeasurements, familyDates, plannedEvents, children, childData, year]);

  const monthItems = items.filter(item => {
    const [itemYear, itemMonth] = item.date.split("-").map(Number);
    return itemYear === year && itemMonth === month + 1 && activeSources.includes(item.source);
  });
  const selectedItems = monthItems.filter(item => item.date === (selectedDate ?? ""));
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const itemsByDate = new Map<string, CalendarItem[]>();
  monthItems.forEach(item => itemsByDate.set(item.date, [...(itemsByDate.get(item.date) ?? []), item]));

  const requestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) { setPermission("unsupported"); return; }
    try { setPermission(await Notification.requestPermission()); } catch { setPermission(Notification.permission); }
  };
  const toggleSource = (source: CalendarSource) => setActiveSources(current => current.includes(source)
    ? current.filter(item => item !== source) : [...current, source]);

  const activeChild = children.find(child => child.id === selectedProfile);

  return (
    <section aria-label="Календарь событий" className="max-w-5xl p-5 sm:p-8">
      {children.map(child => <ChildCalendarSource key={child.id} child={child} onData={receiveChildData} />)}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            <CalendarDays size={23}/> Календарь
          </h1>
          <p className="text-sm text-muted-foreground">Общие даты, медицинские планы и события истории здоровья</p>
        </div>
        <button type="button" onClick={() => { setMonthOffset(0); setSelectedDate(today); }} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted">Сегодня</button>
      </div>

      <div className="mb-5 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Bell size={15} className="text-muted-foreground"/>
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            {permission === "granted" ? "Уведомления браузера разрешены." :
              permission === "denied" ? "Уведомления заблокированы. Измените разрешение в настройках браузера." :
              permission === "unsupported" ? "Этот браузер не поддерживает уведомления." :
              "Разрешите уведомления, чтобы получать напоминания, пока приложение открыто."}
          </span>
          {permission === "default" && <button type="button" onClick={() => void requestPermission()} className="rounded-lg border border-border px-3 py-1.5 text-xs">Разрешить уведомления</button>}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Проверка напоминаний выполняется, пока приложение открыто; фоновые push-уведомления при закрытом браузере не используются.</p>
      </div>

      <div className="mb-5">
        <label className="block max-w-sm text-xs text-muted-foreground">Планирование для профиля
          <select value={selectedProfile} onChange={event => setSelectedProfile(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
            <option value="adult">Взрослый профиль</option>
            {children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        {selectedProfile === "adult" ? <CalendarEventManager key="adult-calendar" onOpenHistory={onOpenHistory} /> :
          activeChild ? <CalendarEventManager key={activeChild.id} storagePrefix={`childHealth:${activeChild.id}:`} profileLabel={activeChild.name} onOpenHistory={onOpenHistory} /> : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(SOURCE_META) as CalendarSource[]).map(source => {
          const meta = SOURCE_META[source];
          const active = activeSources.includes(source);
          return <button key={source} type="button" aria-pressed={active} onClick={() => toggleSource(source)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? meta.color + " border-transparent" : "border-border text-muted-foreground"}`}>
            {meta.label}
          </button>;
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button type="button" aria-label="Предыдущий месяц" onClick={() => { setMonthOffset(value => value - 1); setSelectedDate(null); }} className="rounded-lg p-2 hover:bg-muted"><ChevronLeft size={17}/></button>
          <h2 aria-live="polite" aria-atomic="true" className="text-sm font-semibold capitalize">{monthLabel(year, month)}</h2>
          <button type="button" aria-label="Следующий месяц" onClick={() => { setMonthOffset(value => value + 1); setSelectedDate(null); }} className="rounded-lg p-2 hover:bg-muted"><ChevronRight size={17}/></button>
        </div>
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(day => <div key={day} className="py-2 text-center text-[10px] font-medium text-muted-foreground">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="min-h-[66px] border-b border-r border-border/60 bg-muted/10 sm:min-h-[88px]"/>;
            const date = isoDate(new Date(year, month, day));
            const dayItems = itemsByDate.get(date) ?? [];
            const active = selectedDate === date;
            return <button key={date} type="button" onClick={() => setSelectedDate(active ? null : date)}
              aria-label={`${day} ${monthLabel(year, month)}, событий: ${dayItems.length}`}
              aria-pressed={active}
              className={`min-h-[66px] border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-[88px] sm:p-2 ${active ? "bg-primary/10 ring-1 ring-inset ring-primary" : "hover:bg-muted/50"}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${date === today ? "bg-primary text-primary-foreground font-semibold" : "text-foreground"}`}>{day}</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {dayItems.slice(0, 4).map(item => <span key={item.id} title={item.title}
                  className={`h-1.5 w-1.5 rounded-full ${item.source === "health" ? "bg-rose-500" : item.source === "monitoring" ? "bg-amber-500" : item.source === "labs" ? "bg-sky-500" : item.source === "planned" ? "bg-emerald-500" : "bg-violet-500"}`}/>)}
                {dayItems.length > 4 && <span className="text-[9px] text-muted-foreground">+{dayItems.length - 4}</span>}
              </div>
            </button>;
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 aria-live="polite" aria-atomic="true" className="text-sm font-semibold">{selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "События месяца"}</h2>
          <span aria-live="polite" aria-atomic="true" className="text-xs text-muted-foreground">{selectedDate ? selectedItems.length : monthItems.length} событий</span>
        </div>
        {(selectedDate ? selectedItems : monthItems).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{selectedDate ? "На эту дату событий нет." : "В этом месяце событий нет."}</div>
        ) : (
          <div className="space-y-2">
            {(selectedDate ? selectedItems : monthItems).map(item => {
              const meta = SOURCE_META[item.source];
              const Icon = meta.Icon;
              return <article key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
                <div className={`rounded-lg p-2 ${meta.color}`}><Icon size={16}/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(item.date + "T00:00:00").toLocaleDateString("ru-RU")}{item.person ? ` · ${item.person}` : ""} · {meta.label}</p>
                  {item.details && <p className="mt-1 text-xs text-muted-foreground">{item.details}</p>}
                </div>
              </article>;
            })}
          </div>
        )}
      </div>
      <p className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground"><Bell size={12}/> Запланированные события хранятся отдельно по каждому профилю и синхронизируются с аккаунтом вместе с медицинской историей.</p>
    </section>
  );
}
