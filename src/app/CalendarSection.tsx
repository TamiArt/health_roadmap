import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, HeartPulse, FlaskConical, Bell, Users, ClipboardCheck } from "lucide-react";
import { usePersistentState } from "./storage";
import type { HealthEvent, HealthMonitoringItem, LabResultEntry, FamilyDate } from "./healthRecords";
import { LIFE_STAGES, type Child, type LabMeasurement } from "./data";

type CalendarSource = "health" | "monitoring" | "labs" | "family";
type CalendarItem = {
  id: string;
  date: string;
  title: string;
  details?: string;
  source: CalendarSource;
  person?: string;
};

type ChildCalendarData = {
  events: HealthEvent[];
  monitoring: HealthMonitoringItem[];
  labs: LabResultEntry[];
};

const SOURCE_META: Record<CalendarSource, { label: string; color: string; Icon: typeof HeartPulse }> = {
  health: { label: "Здоровье", color: "bg-rose-100 text-rose-700", Icon: HeartPulse },
  monitoring: { label: "На контроле", color: "bg-amber-100 text-amber-800", Icon: ClipboardCheck },
  labs: { label: "Анализы", color: "bg-sky-100 text-sky-700", Icon: FlaskConical },
  family: { label: "Семья", color: "bg-violet-100 text-violet-700", Icon: Users },
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
  // Keep leap-day anniversaries on the last day of February in non-leap years.
  if (candidate.getMonth() !== month - 1) candidate.setDate(0);
  return isoDate(candidate);
}

function ChildCalendarSource({ child, onData }: { child: Child; onData: (id: string, data: ChildCalendarData) => void }) {
  const [events] = usePersistentState<HealthEvent[]>(`childHealth:${child.id}:healthEvents`, []);
  const [monitoring] = usePersistentState<HealthMonitoringItem[]>(`childHealth:${child.id}:healthMonitoring`, []);
  const [labs] = usePersistentState<LabResultEntry[]>(`childHealth:${child.id}:labResultEntries`, []);
  useEffect(() => onData(child.id, { events, monitoring, labs }), [child.id, events, monitoring, labs, onData]);
  return null;
}

export function CalendarSection() {
  const [healthEvents] = usePersistentState<HealthEvent[]>("healthEvents", []);
  const [monitoring] = usePersistentState<HealthMonitoringItem[]>("healthMonitoring", []);
  const [labResults] = usePersistentState<LabResultEntry[]>("labResultEntries", []);
  const [catalogMeasurements] = usePersistentState<Record<string, LabMeasurement[]>>("labMeasurements", {});
  const [familyDates] = usePersistentState<FamilyDate[]>("familyEvents", []);
  const [children] = usePersistentState<Child[]>("children", []);
  const [childData, setChildData] = useState<Record<string, ChildCalendarData>>({});
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeSources, setActiveSources] = useState<CalendarSource[]>(["health", "monitoring", "labs", "family"]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const receiveChildData = useCallback((id: string, data: ChildCalendarData) => {
    setChildData(previous => {
      const current = previous[id];
      if (current && current.events === data.events && current.monitoring === data.monitoring && current.labs === data.labs) return previous;
      return { ...previous, [id]: data };
    });
  }, []);

  const now = new Date();
  const visibleMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const today = isoDate(now);

  const items = useMemo(() => {
    const result: CalendarItem[] = [];
    healthEvents.forEach(event => result.push({
      id: `health:${event.id}`, date: event.date, title: event.title,
      details: event.description || undefined, source: "health",
    }));
    monitoring.forEach(item => result.push({
      id: `monitor:${item.id}`, date: item.nextDueDate,
      title: `Проверка: ${item.name}`,
      details: item.reminder.enabled ? "Напоминание включено" : "Контрольная дата",
      source: "monitoring",
    }));
    const testNames = new Map(LIFE_STAGES.flatMap(stage => stage.tests.map(test => [test.id, test.name] as const)));
    Object.entries(catalogMeasurements).forEach(([testId, measurements]) => {
      measurements.forEach(measurement => {
        result.push({
          id: `catalog-lab:${testId}:${measurement.id}`,
          date: measurement.date,
          title: testNames.get(testId) ?? "Результат анализа",
          details: `${measurement.value}${measurement.unit ? ` ${measurement.unit}` : ""}`,
          source: "labs",
        });
      });
    });
    labResults.forEach(entry => result.push({
      id: `lab:${entry.id}`, date: entry.date, title: entry.testName,
      details: entry.indicators.map(value => `${value.name}: ${value.value} ${value.unit}`).join(" · "),
      source: "labs",
    }));
    familyDates.forEach(event => {
      const date = familyDateInYear(event, year);
      if (date) result.push({
        id: `family:${event.id}:${date}`, date, title: event.title,
        details: event.reminder?.enabled ? "Памятная дата · напоминание включено" : "Памятная дата",
        source: "family",
      });
    });
    children.forEach(child => {
      const data = childData[child.id];
      if (!data) return;
      data.events.forEach(event => result.push({
        id: `child-health:${child.id}:${event.id}`, date: event.date,
        title: event.title, details: event.description || "Медицинское событие",
        source: "health", person: child.name,
      }));
      data.monitoring.forEach(item => result.push({
        id: `child-monitor:${child.id}:${item.id}`, date: item.nextDueDate,
        title: `Проверка: ${item.name}`, details: "Контрольная дата",
        source: "monitoring", person: child.name,
      }));
      data.labs.forEach(entry => result.push({
        id: `child-lab:${child.id}:${entry.id}`, date: entry.date,
        title: entry.testName, details: "Результат анализа",
        source: "labs", person: child.name,
      }));
    });
    return result.filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [healthEvents, monitoring, labResults, catalogMeasurements, familyDates, children, childData, year]);

  const monthItems = items.filter(item => {
    const [itemYear, itemMonth] = item.date.split("-").map(Number);
    return itemYear === year && itemMonth === month + 1 && activeSources.includes(item.source);
  });
  const selectedItems = monthItems.filter(item => item.date === (selectedDate ?? ""));
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const itemsByDate = new Map<string, CalendarItem[]>();
  monthItems.forEach(item => itemsByDate.set(item.date, [...(itemsByDate.get(item.date) ?? []), item]));

  function toggleSource(source: CalendarSource) {
    setActiveSources(current => current.includes(source)
      ? current.filter(item => item !== source)
      : [...current, source]);
  }

  return (
    <section className="max-w-5xl p-5 sm:p-8">
      {children.map(child => <ChildCalendarSource key={child.id} child={child} onData={receiveChildData}/>)}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            <CalendarDays size={23}/> Календарь
          </h1>
          <p className="text-sm text-muted-foreground">Общие даты и события из разных разделов приложения</p>
        </div>
        <button type="button" onClick={() => { setMonthOffset(0); setSelectedDate(today); }} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted">Сегодня</button>
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
          <h2 className="text-sm font-semibold capitalize">{monthLabel(year, month)}</h2>
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
                {dayItems.slice(0, 4).map(item => <span key={item.id} title={item.title} className={`h-1.5 w-1.5 rounded-full ${item.source === "health" ? "bg-rose-500" : item.source === "monitoring" ? "bg-amber-500" : item.source === "labs" ? "bg-sky-500" : "bg-violet-500"}`}/>)}
                {dayItems.length > 4 && <span className="text-[9px] text-muted-foreground">+{dayItems.length - 4}</span>}
              </div>
            </button>;
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "События месяца"}</h2>
          <span className="text-xs text-muted-foreground">{selectedDate ? selectedItems.length : monthItems.length} событий</span>
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
      <p className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground"><Bell size={12}/> Календарь показывает даты из записей приложения. Уведомления браузера зависят от разрешения и работы приложения.</p>
    </section>
  );
}
