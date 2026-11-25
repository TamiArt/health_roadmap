import { useMemo, useState } from "react";
import { Bell, CalendarPlus, Link2, Pencil, Trash2 } from "lucide-react";
import { usePersistentState } from "./storage";
import { CALENDAR_EVENT_STATUSES, CALENDAR_EVENT_TYPES, createCalendarEvent, sortCalendarEvents, validateCalendarEvent, type CalendarEventStatus, type CalendarEventType, type CalendarLinkType, type CalendarPlanEvent } from "./calendarModel";
import type { HealthEvent, HealthMonitoringItem, LabResultEntry, VaccineAdministration } from "./healthRecords";

type LinkOption = { value: string; label: string; type: CalendarLinkType; id: string };
type EventDraft = Omit<CalendarPlanEvent, "id" | "createdAt" | "updatedAt">;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const emptyDraft = (): EventDraft => ({
  type: "appointment", title: "", date: today(), endDate: "", time: "09:00", status: "planned",
  facility: "", details: "", reminder: { enabled: true, leadDays: 1, time: "09:00" },
});

export function CalendarEventManager({ storagePrefix = "", profileLabel = "Взрослый профиль", onOpenHistory }: { storagePrefix?: string; profileLabel?: string; onOpenHistory?: () => void }) {
  const [events, setEvents, ready, error, conflict] = usePersistentState<CalendarPlanEvent[]>(`${storagePrefix}calendarEvents`, []);
  const [healthEvents] = usePersistentState<HealthEvent[]>(`${storagePrefix}healthEvents`, []);
  const [labs] = usePersistentState<LabResultEntry[]>(`${storagePrefix}labResultEntries`, []);
  const [vaccines] = usePersistentState<VaccineAdministration[]>(`${storagePrefix}vaccineRecords`, []);
  const [monitoring] = usePersistentState<HealthMonitoringItem[]>(`${storagePrefix}healthMonitoring`, []);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const linkOptions = useMemo<LinkOption[]>(() => [
    ...healthEvents.map(item => ({ value: `health:${item.id}`, label: `Событие здоровья · ${item.date} · ${item.title}`, type: "health" as const, id: item.id })),
    ...labs.map(item => ({ value: `lab:${item.id}`, label: `Анализ · ${item.date} · ${item.testName}`, type: "lab" as const, id: item.id })),
    ...vaccines.map(item => ({ value: `vaccine:${item.id}`, label: `Вакцинация · ${item.date} · ${item.vaccineName}`, type: "vaccine" as const, id: item.id })),
    ...monitoring.map(item => ({ value: `monitoring:${item.id}`, label: `Контроль · ${item.name}`, type: "monitoring" as const, id: item.id })),
  ], [healthEvents, labs, vaccines, monitoring]);

  const ordered = sortCalendarEvents(events);
  const openNew = () => { setDraft(emptyDraft()); setEditingId(null); setFormError(""); setFormOpen(true); };
  const openEdit = (event: CalendarPlanEvent) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...values } = event;
    setDraft(values); setEditingId(event.id); setFormError(""); setFormOpen(true);
  };
  const save = () => {
    const validation = validateCalendarEvent(draft);
    if (validation) { setFormError(validation); return; }
    const selected = draft.link ? linkOptions.find(option => option.value === `${draft.link?.type}:${draft.link?.id}`) : undefined;
    const normalized: EventDraft = {
      ...draft,
      title: draft.title.trim(), facility: draft.facility.trim(), details: draft.details.trim(),
      link: selected ? { type: selected.type, id: selected.id, label: selected.label } : draft.link,
    };
    const timestamp = new Date().toISOString();
    if (editingId) {
      setEvents(current => current.map(event => event.id === editingId ? { ...event, ...normalized, updatedAt: timestamp } : event));
    } else {
      setEvents(current => [...current, createCalendarEvent(normalized)]);
    }
    setFormOpen(false); setEditingId(null); setFormError("");
  };
  const remove = (id: string) => {
    if (!window.confirm("Удалить это событие календаря?")) return;
    setEvents(current => current.filter(event => event.id !== id));
  };
  const updateStatus = (id: string, status: CalendarEventStatus) => {
    setEvents(current => current.map(event => event.id === id ? { ...event, status, updatedAt: new Date().toISOString() } : event));
  };
  if (!ready) return <p role="status" aria-busy="true" className="text-xs text-muted-foreground">Загрузка планов календаря…</p>;
  if (error) return <p role="alert" className="text-xs text-red-600">{error}</p>;

  return (
    <section aria-label="Планирование медицинских событий" className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 aria-live="polite" aria-atomic="true" className="flex items-center gap-2 text-base font-semibold text-foreground"><CalendarPlus size={17}/> Планы и напоминания</h2>
          <p className="mt-1 text-xs text-muted-foreground">{profileLabel} · приёмы, обследования, анализы, вакцинация и курсы лечения</p>
        </div>
        <button type="button" onClick={openNew} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Добавить событие</button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">Напоминания настраиваются для каждого события; разрешение браузера на уведомления управляется в календаре.</p>
      {conflict && <p role="status" className="mt-2 text-xs text-amber-700">Запись была изменена в другой вкладке. Проверьте актуальные данные перед редактированием.</p>}

      {formOpen && <div className="mt-4 rounded-xl border border-border p-3 sm:p-4">
        <h3 className="mb-3 text-sm font-semibold">{editingId ? "Изменить событие" : "Новое событие"}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Тип события
            <select value={draft.type} onChange={e => setDraft(v => ({ ...v, type: e.target.value as CalendarEventType }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {Object.entries(CALENDAR_EVENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">Статус
            <select value={draft.status} onChange={e => setDraft(v => ({ ...v, status: e.target.value as CalendarEventStatus }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {Object.entries(CALENDAR_EVENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Название
            <input maxLength={120} value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} placeholder="Например, приём гинеколога" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>
          <label className="text-xs text-muted-foreground">Дата начала
            <input type="date" value={draft.date} onChange={e => setDraft(v => ({ ...v, date: e.target.value, endDate: v.endDate && v.endDate < e.target.value ? "" : v.endDate }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>
          <label className="text-xs text-muted-foreground">Время
            <input type="time" value={draft.time} onChange={e => setDraft(v => ({ ...v, time: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>
          {(draft.type === "medication" || draft.type === "treatment") && <label className="text-xs text-muted-foreground">Дата окончания курса
            <input type="date" min={draft.date} value={draft.endDate} onChange={e => setDraft(v => ({ ...v, endDate: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>}
          <label className="text-xs text-muted-foreground">Врач / учреждение / место
            <input maxLength={160} value={draft.facility} onChange={e => setDraft(v => ({ ...v, facility: e.target.value }))} placeholder="Врач, клиника или аптека" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Примечания, схема или подготовка
            <textarea maxLength={1500} rows={3} value={draft.details} onChange={e => setDraft(v => ({ ...v, details: e.target.value }))} placeholder="Дозировка по назначению врача, подготовка к анализу, адрес…" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Связать с медицинской историей
            <select value={draft.link ? `${draft.link.type}:${draft.link.id}` : ""} onChange={e => {
              const option = linkOptions.find(item => item.value === e.target.value);
              setDraft(v => ({ ...v, link: option ? { type: option.type, id: option.id, label: option.label } : undefined }));
            }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Не связывать</option>
              {linkOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2 rounded-lg bg-muted/40 p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-foreground"><input type="checkbox" checked={draft.reminder.enabled} onChange={e => setDraft(v => ({ ...v, reminder: { ...v.reminder, enabled: e.target.checked } }))}/> Напомнить о событии</label>
            {draft.reminder.enabled && <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground">За сколько дней
                <input type="number" min={0} max={365} value={draft.reminder.leadDays} onChange={e => setDraft(v => ({ ...v, reminder: { ...v.reminder, leadDays: Number(e.target.value) } }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
              </label>
              <label className="text-xs text-muted-foreground">Время уведомления
                <input type="time" value={draft.reminder.time} onChange={e => setDraft(v => ({ ...v, reminder: { ...v.reminder, time: e.target.value } }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"/>
              </label>
            </div>}
          </div>
        </div>
        {formError && <p role="alert" className="mt-3 text-xs text-red-600">{formError}</p>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs">Отмена</button>
          <button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Сохранить</button>
        </div>
      </div>}

      <div className="mt-4 space-y-2">
        {ordered.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Планов пока нет. Добавьте приём, анализ, вакцинацию или курс лечения.</p> :
          ordered.map(event => <article key={event.id} className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{CALENDAR_EVENT_TYPES[event.type]}</span>
                  <span className="text-[10px] text-muted-foreground">{CALENDAR_EVENT_STATUSES[event.status]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(event.date + "T00:00:00").toLocaleDateString("ru-RU")} · {event.time}{event.endDate ? ` · курс до ${event.endDate}` : ""}{event.facility ? ` · ${event.facility}` : ""}</p>
                {event.details && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{event.details}</p>}
                {event.link && <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-primary"><span className="flex items-center gap-1"><Link2 size={12}/> Связано: {event.link.label}</span>{onOpenHistory && <button type="button" onClick={onOpenHistory} className="font-medium underline underline-offset-2">Открыть медицинскую историю</button>}</div>}
                {event.reminder.enabled && event.status === "planned" && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Bell size={11}/> За {event.reminder.leadDays} дн. · {event.reminder.time}</p>}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label={`Изменить: ${event.title}`} onClick={() => openEdit(event)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Pencil size={14}/></button>
                <button type="button" aria-label={`Удалить: ${event.title}`} onClick={() => remove(event.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Trash2 size={14}/></button>
              </div>
            </div>
            {event.status === "planned" && <div className="mt-2 flex justify-end">
              <button type="button" onClick={() => updateStatus(event.id, "completed")} className="text-xs font-medium text-primary hover:underline">Отметить выполненным</button>
            </div>}
          </article>)
        }
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Напоминания отправляются браузером, пока Life Maps открыто. Синхронизация планов между устройствами выполняется вместе с остальными данными аккаунта.</p>
    </section>
  );
}
