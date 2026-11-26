import { useMemo, useState } from "react";
import { Plus, Trash2, Check, CalendarClock, Activity, HeartPulse, Pencil } from "lucide-react";
import { usePersistentState } from "./storage";
import {
  buildHealthEvent,
  validateHealthEvent,
  validateMonitoringItem,
  validateMonitoringReading,
  type HealthEvent,
  type HealthEventKind,
  type HealthMonitoringItem,
} from "./healthRecords";
import { INP, createId } from "./shared";
import { useBrowserReminders } from "./useBrowserReminders";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const EVENT_TYPES: Array<[HealthEventKind, string]> = [
  ["operation", "Операция"],
  ["fracture", "Перелом"],
  ["injury", "Травма"],
  ["hospitalization", "Госпитализация"],
  ["diagnosis", "Диагноз"],
  ["procedure", "Процедура"],
  ["other", "Другое"],
];

function DateInput({ value, onChange, ariaLabel = "Дата" }: { value: string; onChange: (value: string) => void; ariaLabel?: string }) {
  return <input aria-label={ariaLabel} type="date" value={value} onChange={event => onChange(event.target.value)} className={INP} />;
}

export function HealthEventsTab({ storageKey = "healthEvents" }: { storageKey?: string }) {
  const [events, setEvents, ready, error, conflict] = usePersistentState<HealthEvent[]>(storageKey, []);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ date: today(), kind: "other" as HealthEventKind, title: "", description: "", facility: "" });
  const [formError, setFormError] = useState<string | null>(null);

  function save() {
    const validation = validateHealthEvent(form);
    if (validation) { setFormError(validation); return; }
    setEvents(previous => {
      const next = editingId
        ? previous.map(item => item.id === editingId ? { ...form, id: editingId } : item)
        : [...previous, buildHealthEvent(form)];
      return [...next].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    });
    setForm({ date: today(), kind: "other", title: "", description: "", facility: "" });
    setEditing(false);
    setEditingId(null);
    setFormError(null);
  }

  function startEdit(event: HealthEvent) {
    setEditingId(event.id);
    setForm({ date: event.date, kind: event.kind, title: event.title, description: event.description, facility: event.facility ?? "" });
    setEditing(true);
    setFormError(null);
  }

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return [...events]
      .filter(event => !normalized || [event.title, event.description, event.facility ?? "", event.kind]
        .some(value => value.toLocaleLowerCase("ru").includes(normalized)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ru"));
  }, [events, query]);

  if (!ready) return <p className="text-sm text-muted-foreground">Загрузка медицинских событий…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold">Медицинские события</h2><p className="text-xs text-muted-foreground">Операции, травмы, переломы, госпитализации и другие события</p></div>
        <button type="button" onClick={() => { setEditingId(null); setForm({ date: today(), kind: "other", title: "", description: "", facility: "" }); setEditing(value => !value); setFormError(null); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить</button>
      </div>
      {editing && <div className="rounded-xl border border-primary/20 bg-card p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <DateInput value={form.date} onChange={date => setForm(value => ({ ...value, date }))}/>
          <select aria-label="Тип события" value={form.kind} onChange={event => setForm(value => ({ ...value, kind: event.target.value as HealthEventKind }))} className={INP}>{EVENT_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </div>
        <input aria-label="Название события" value={form.title} maxLength={120} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} placeholder="Например, перелом лучевой кости" className={INP}/>
        <input aria-label="Медицинское учреждение" value={form.facility} maxLength={160} onChange={event => setForm(value => ({ ...value, facility: event.target.value }))} placeholder="Клиника или учреждение (необязательно)" className={INP}/>
        <textarea aria-label="Описание события" value={form.description} maxLength={1000} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} placeholder="Подробности, лечение, последствия, заметки" rows={3} className={INP}/>
        {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditing(false); setEditingId(null); setFormError(null); }} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">{editingId ? "Сохранить изменения" : "Сохранить"}</button></div>
      </div>}
      <label className="block text-xs text-muted-foreground">Поиск по событиям
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название, тип, клиника, описание" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
      </label>
      {conflict && <p role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">Записи изменены в другой вкладке. Загружена последняя сохранённая версия.</p>}
      {visibleEvents.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{events.length ? "По запросу событий нет." : "Медицинские события пока не добавлены."}</div> :
        <div className="space-y-2">{visibleEvents.map(event => <article key={event.id} id={`medical-source-events-${event.id}`} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><HeartPulse size={17}/></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium">{event.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{EVENT_TYPES.find(([id]) => id === event.kind)?.[1] ?? "Другое"}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.date}{event.facility ? ` · ${event.facility}` : ""}</p>{event.description && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{event.description}</p>}</div>
          <div className="flex gap-1"><button type="button" aria-label={`Изменить событие ${event.title}`} onClick={() => startEdit(event)} className="p-1 text-muted-foreground hover:text-primary"><Pencil size={14}/></button><button type="button" aria-label={`Удалить событие ${event.title}`} onClick={() => { if (window.confirm("Удалить это медицинское событие?")) setEvents(previous => previous.filter(item => item.id !== event.id)); }} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div>
        </article>)}</div>}
    </section>
  );
}

function daysUntil(date: string): number {
  const due = new Date(date + "T00:00:00");
  const current = new Date(today() + "T00:00:00");
  return Math.round((due.getTime() - current.getTime()) / 86400000);
}

export function ReminderPermission({ enabled, onEnable }: { enabled: boolean; onEnable: (value: boolean) => void }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  async function toggle() {
    if (!enabled && "Notification" in window && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
      onEnable(result === "granted");
      return;
    }
    if (!enabled && !("Notification" in window)) setPermission("unsupported");
    onEnable(!enabled && permission !== "unsupported" && permission !== "denied");
  }
  return <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 p-3"><div className="min-w-0"><p className="text-xs font-medium">Уведомления браузера</p><p className="text-[10px] text-muted-foreground">{permission === "unsupported" ? "Браузер не поддерживает уведомления" : permission === "denied" ? "Разрешение запрещено в настройках браузера" : enabled ? "Разрешены" : "Выключены"}</p></div><button type="button" onClick={toggle} disabled={permission === "unsupported" || permission === "denied"} className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40">{enabled ? "Выключить" : "Разрешить"}</button></div>;
}

export function MonitoringTab({ storageKey = "healthMonitoring" }: { storageKey?: string }) {
  const [items, setItems, ready, error, conflict] = usePersistentState<HealthMonitoringItem[]>(storageKey, []);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notificationSettings, setNotificationSettings, notificationSettingsReady] = usePersistentState<{ enabled: boolean }>("notificationSettings", { enabled: false });
  const notificationsEnabled = notificationSettings.enabled;
  const [form, setForm] = useState({ name: "", kind: "measurement" as HealthMonitoringItem["kind"], unit: "", intervalDays: "365", nextDueDate: today(), lastCheckedDate: "", notes: "", reminderEnabled: true, leadDays: "3", time: "09:00" });
  const [formError, setFormError] = useState<string | null>(null);
  const [readingDrafts, setReadingDrafts] = useState<Record<string, { date: string; value: string }>>({});
  const reminders = useMemo(() => items.map(item => ({
    id: item.id, title: item.name, notificationTitle: "Напоминание о проверке", date: item.nextDueDate,
    enabled: item.reminder.enabled, leadDays: item.reminder.leadDays,
    time: item.reminder.time,
  })), [items]);
  useBrowserReminders(reminders, notificationsEnabled);

  function save() {
    const intervalDays = form.intervalDays.trim() ? Number(form.intervalDays) : null;
    const item: Omit<HealthMonitoringItem, "id"> = {
      name: form.name.trim(), kind: form.kind, unit: form.unit.trim(), intervalDays,
      nextDueDate: form.nextDueDate, lastCheckedDate: form.lastCheckedDate, notes: form.notes.trim(),
      reminder: { enabled: form.reminderEnabled, leadDays: Number(form.leadDays), time: form.time },
      measurements: [],
    };
    const validation = validateMonitoringItem(item);
    if (validation) { setFormError(validation); return; }
    setItems(previous => {
      const existing = previous.find(value => value.id === editingId);
      const nextItem = { ...item, id: editingId ?? createId(), measurements: existing?.measurements ?? [] };
      const next = existing ? previous.map(value => value.id === editingId ? nextItem : value) : [...previous, nextItem];
      return [...next].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    });
    setForm({ name: "", kind: "measurement", unit: "", intervalDays: "365", nextDueDate: today(), lastCheckedDate: "", notes: "", reminderEnabled: true, leadDays: "3", time: "09:00" });
    setEditing(false);
    setEditingId(null);
    setFormError(null);
  }

  function startEdit(item: HealthMonitoringItem) {
    setEditingId(item.id);
    setForm({
      name: item.name, kind: item.kind, unit: item.unit, intervalDays: item.intervalDays === null ? "" : String(item.intervalDays),
      nextDueDate: item.nextDueDate, lastCheckedDate: item.lastCheckedDate, notes: item.notes,
      reminderEnabled: item.reminder.enabled, leadDays: String(item.reminder.leadDays), time: item.reminder.time,
    });
    setEditing(true);
    setFormError(null);
  }

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return [...items].filter(item => !normalized || [item.name, item.unit, item.notes]
      .some(value => value.toLocaleLowerCase("ru").includes(normalized)))
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate) || a.name.localeCompare(b.name, "ru"));
  }, [items, query]);

  function addReading(item: HealthMonitoringItem) {
    const draft = readingDrafts[item.id] ?? { date: today(), value: "" };
    const validation = validateMonitoringReading(draft);
    if (validation) { setFormError(validation); return; }
    const value = Number(draft.value);
    setItems(previous => previous.map(current => current.id === item.id ? {
      ...current,
      measurements: [...(current.measurements ?? []).filter(reading => reading.id !== editingReadingId),
        { id: editingReadingId ?? createId(), date: draft.date, value, unit: current.unit }]
        .sort((a, b) => b.date.localeCompare(a.date)),
    } : current));
    setReadingDrafts(previous => ({ ...previous, [item.id]: { date: today(), value: "" } }));
    setEditingReadingId(null);
    setFormError(null);
  }

  function startEditReading(item: HealthMonitoringItem, reading: { id: string; date: string; value: number }) {
    setEditingReadingId(reading.id);
    setReadingDrafts(previous => ({ ...previous, [item.id]: { date: reading.date, value: String(reading.value) } }));
    setFormError(null);
  }

  function markDone(item: HealthMonitoringItem) {
    const checked = today();
    const next = item.intervalDays ? new Date(new Date(checked + "T00:00:00").getTime() + item.intervalDays * 86400000) : new Date(item.nextDueDate + "T00:00:00");
    if (!item.intervalDays) next.setFullYear(next.getFullYear() + 1);
    const nextDueDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    setItems(previous => previous.map(value => value.id === item.id ? { ...value, lastCheckedDate: checked, nextDueDate } : value).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)));
  }

  if (!ready || !notificationSettingsReady) return <p className="text-sm text-muted-foreground">Загрузка списка контроля…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">На контроле</h2><p className="text-xs text-muted-foreground">Показатели и проверки, за которыми вы хотите следить</p></div><button type="button" onClick={() => { setEditingId(null); setForm({ name: "", kind: "measurement", unit: "", intervalDays: "365", nextDueDate: today(), lastCheckedDate: "", notes: "", reminderEnabled: true, leadDays: "3", time: "09:00" }); setEditing(value => !value); setFormError(null); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить</button></div>
    <ReminderPermission enabled={notificationsEnabled} onEnable={enabled => setNotificationSettings({ enabled })}/>
    {conflict && <p role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">Список контроля изменён в другой вкладке. Загружена последняя сохранённая версия.</p>}
    {editing && <div className="space-y-2 rounded-xl border border-primary/20 bg-card p-4">
      <input aria-label="Название контроля" value={form.name} maxLength={100} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} placeholder="Например, глюкоза крови или цитология" className={INP}/>
      <div className="grid grid-cols-2 gap-2"><select aria-label="Тип контроля" value={form.kind} onChange={event => setForm(value => ({ ...value, kind: event.target.value as HealthMonitoringItem["kind"] }))} className={INP}><option value="measurement">Показатель</option><option value="periodic-check">Периодическая проверка</option></select><input aria-label="Единица измерения" value={form.unit} maxLength={24} onChange={event => setForm(value => ({ ...value, unit: event.target.value }))} placeholder="Единица (ммоль/л)" className={INP}/></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Следующая проверка<DateInput ariaLabel="Следующая проверка" value={form.nextDueDate} onChange={nextDueDate => setForm(value => ({ ...value, nextDueDate }))}/></label><label className="text-xs text-muted-foreground">Интервал, дней<input aria-label="Интервал в днях" type="number" min="1" max="3650" value={form.intervalDays} onChange={event => setForm(value => ({ ...value, intervalDays: event.target.value }))} className={INP}/></label></div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.reminderEnabled} onChange={event => setForm(value => ({ ...value, reminderEnabled: event.target.checked }))}/> Напоминать о проверке</label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">За сколько дней<input aria-label="Дней до срока" type="number" min="0" max="365" value={form.leadDays} onChange={event => setForm(value => ({ ...value, leadDays: event.target.value }))} className={INP}/></label><label className="text-xs text-muted-foreground">Время<input aria-label="Время напоминания" type="time" value={form.time} onChange={event => setForm(value => ({ ...value, time: event.target.value }))} className={INP}/></label></div>
      <textarea aria-label="Заметки к контролю" value={form.notes} maxLength={1000} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} placeholder="Заметки (необязательно)" rows={2} className={INP}/>
      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditing(false); setEditingId(null); setFormError(null); }} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">{editingId ? "Сохранить изменения" : "Сохранить"}</button></div>
    </div>}
    <label className="block text-xs text-muted-foreground">Поиск по контролируемым показателям
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название, единица, заметка" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
    </label>
    {visibleItems.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{items.length ? "По запросу ничего не найдено." : "Пока ничего не добавлено. Создайте список показателей и проверок, которые хотите контролировать."}</div> : <div className="space-y-2">{visibleItems.map(item => {
      const remaining = daysUntil(item.nextDueDate);
      const draft = readingDrafts[item.id] ?? { date: today(), value: "" };
      return <article key={item.id} id={`medical-source-monitoring-${item.id}`} className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{item.kind === "measurement" ? <Activity size={17}/> : <CalendarClock size={17}/>}</div>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">Следующая проверка: {item.nextDueDate}{item.unit ? ` · ${item.unit}` : ""}</p><p className={`mt-1 text-xs ${remaining < 0 ? "text-red-600" : remaining <= 7 ? "text-amber-700" : "text-muted-foreground"}`}>{remaining < 0 ? `Просрочено на ${Math.abs(remaining)} дн.` : remaining === 0 ? "Сегодня" : `Через ${remaining} дн.`}</p>{item.lastCheckedDate && <p className="mt-1 text-[10px] text-muted-foreground">Последняя проверка: {item.lastCheckedDate}</p>}{item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
          {item.kind === "measurement" && <div className="mt-3 space-y-2"><p className="text-[11px] font-medium text-muted-foreground">История значений</p>
            {(item.measurements ?? []).map(reading => <div key={reading.id} id={`medical-source-monitoring-${item.id}-${reading.id}`} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{reading.date}</span><strong className="tabular-nums">{reading.value} {reading.unit}</strong><div className="flex gap-1"><button type="button" aria-label={`Изменить значение ${item.name} от ${reading.date}`} onClick={() => startEditReading(item, reading)} className="rounded border px-2 py-1 text-primary">Изменить</button><button type="button" aria-label={`Удалить значение ${item.name} от ${reading.date}`} onClick={() => { if (window.confirm("Удалить это измерение?")) setItems(previous => previous.map(current => current.id === item.id ? { ...current, measurements: (current.measurements ?? []).filter(value => value.id !== reading.id) } : current)); }} className="rounded border px-2 py-1 text-red-600">Удалить</button></div></div>)}
            <div className="flex flex-wrap items-center gap-2"><input aria-label={`Дата значения ${item.name}`} type="date" value={draft.date} onChange={event => setReadingDrafts(previous => ({ ...previous, [item.id]: { ...draft, date: event.target.value } }))} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs"/><input aria-label={`Значение ${item.name}`} type="number" step="any" value={draft.value} onChange={event => setReadingDrafts(previous => ({ ...previous, [item.id]: { ...draft, value: event.target.value } }))} placeholder="Значение" className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-xs"/><button type="button" onClick={() => addReading(item)} className="rounded-lg border px-2 py-1 text-xs text-primary">{editingReadingId ? "Сохранить" : "Добавить значение"}</button>{editingReadingId && <button type="button" onClick={() => { setEditingReadingId(null); setReadingDrafts(previous => ({ ...previous, [item.id]: { date: today(), value: "" } })); }} className="rounded-lg border px-2 py-1 text-xs">Отмена</button>}</div>
            {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
          </div>}
        </div>
        <div className="flex flex-col gap-1"><button type="button" title="Отметить выполненным" aria-label={`Отметить ${item.name} выполненным`} onClick={() => markDone(item)} className="rounded-lg border p-1.5 text-emerald-700"><Check size={14}/></button><button type="button" aria-label={`Изменить ${item.name}`} onClick={() => startEdit(item)} className="rounded-lg border p-1.5 text-primary"><Pencil size={14}/></button><button type="button" title="Удалить" aria-label={`Удалить ${item.name}`} onClick={() => { if (window.confirm("Удалить этот пункт контроля вместе с историей измерений?")) setItems(previous => previous.filter(value => value.id !== item.id)); }} className="rounded-lg border p-1.5 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div>
      </article>;
    })}</div>}
    <p className="text-[10px] leading-relaxed text-muted-foreground">Уведомления браузера отправляются, пока приложение открыто и браузер разрешил уведомления. Для надёжных уведомлений при закрытом приложении понадобится отдельная push-инфраструктура.</p>
  </section>;
}
