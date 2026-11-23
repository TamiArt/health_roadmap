import { useMemo, useState } from "react";
import { Plus, Trash2, Check, CalendarClock, Activity, HeartPulse } from "lucide-react";
import { usePersistentState } from "./storage";
import {
  buildHealthEvent,
  validateHealthEvent,
  validateMonitoringItem,
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

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input aria-label="Дата" type="date" value={value} onChange={event => onChange(event.target.value)} className={INP} />;
}

export function HealthEventsTab() {
  const [events, setEvents, ready, error] = usePersistentState<HealthEvent[]>("healthEvents", []);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ date: today(), kind: "other" as HealthEventKind, title: "", description: "", facility: "" });
  const [formError, setFormError] = useState<string | null>(null);

  function save() {
    const validation = validateHealthEvent(form);
    if (validation) { setFormError(validation); return; }
    setEvents(previous => [...previous, buildHealthEvent(form)].sort((a, b) => b.date.localeCompare(a.date)));
    setForm({ date: today(), kind: "other", title: "", description: "", facility: "" });
    setEditing(false);
    setFormError(null);
  }

  if (!ready) return <p className="text-sm text-muted-foreground">Загрузка медицинских событий…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold">Медицинские события</h2><p className="text-xs text-muted-foreground">Операции, травмы, переломы, госпитализации и другие события</p></div>
        <button type="button" onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить</button>
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
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Сохранить</button></div>
      </div>}
      {events.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Медицинские события пока не добавлены.</div> :
        <div className="space-y-2">{events.map(event => <article key={event.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><HeartPulse size={17}/></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium">{event.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{EVENT_TYPES.find(([id]) => id === event.kind)?.[1] ?? "Другое"}</span></div><p className="mt-1 text-xs text-muted-foreground">{event.date}{event.facility ? ` · ${event.facility}` : ""}</p>{event.description && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{event.description}</p>}</div>
          <button type="button" aria-label={`Удалить событие ${event.title}`} onClick={() => { if (window.confirm("Удалить это медицинское событие?")) setEvents(previous => previous.filter(item => item.id !== event.id)); }} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button>
        </article>)}</div>}
    </section>
  );
}

function daysUntil(date: string): number {
  const due = new Date(date + "T00:00:00");
  const current = new Date(today() + "T00:00:00");
  return Math.round((due.getTime() - current.getTime()) / 86400000);
}

function ReminderPermission({ enabled, onEnable }: { enabled: boolean; onEnable: (value: boolean) => void }) {
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

export function MonitoringTab() {
  const [items, setItems, ready, error] = usePersistentState<HealthMonitoringItem[]>("healthMonitoring", []);
  const [editing, setEditing] = useState(false);
  const [notificationSettings, setNotificationSettings, notificationSettingsReady] = usePersistentState<{ enabled: boolean }>("notificationSettings", { enabled: false });
  const notificationsEnabled = notificationSettings.enabled;
  const [form, setForm] = useState({ name: "", kind: "measurement" as HealthMonitoringItem["kind"], unit: "", intervalDays: "365", nextDueDate: today(), lastCheckedDate: "", notes: "", reminderEnabled: true, leadDays: "3", time: "09:00" });
  const [formError, setFormError] = useState<string | null>(null);
  const reminders = useMemo(() => items.map(item => ({
    id: item.id, title: item.name, date: item.nextDueDate,
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
    };
    const validation = validateMonitoringItem(item);
    if (validation) { setFormError(validation); return; }
    setItems(previous => [...previous, { ...item, id: createId() }].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)));
    setForm({ name: "", kind: "measurement", unit: "", intervalDays: "365", nextDueDate: today(), lastCheckedDate: "", notes: "", reminderEnabled: true, leadDays: "3", time: "09:00" });
    setEditing(false);
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
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">На контроле</h2><p className="text-xs text-muted-foreground">Показатели и проверки, за которыми вы хотите следить</p></div><button type="button" onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить</button></div>
    <ReminderPermission enabled={notificationsEnabled} onEnable={enabled => setNotificationSettings({ enabled })}/>
    {editing && <div className="space-y-2 rounded-xl border border-primary/20 bg-card p-4">
      <input aria-label="Название контроля" value={form.name} maxLength={100} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} placeholder="Например, глюкоза крови или цитология" className={INP}/>
      <div className="grid grid-cols-2 gap-2"><select aria-label="Тип контроля" value={form.kind} onChange={event => setForm(value => ({ ...value, kind: event.target.value as HealthMonitoringItem["kind"] }))} className={INP}><option value="measurement">Показатель</option><option value="periodic-check">Периодическая проверка</option></select><input aria-label="Единица измерения" value={form.unit} maxLength={24} onChange={event => setForm(value => ({ ...value, unit: event.target.value }))} placeholder="Единица (ммоль/л)" className={INP}/></div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Следующая проверка<DateInput value={form.nextDueDate} onChange={nextDueDate => setForm(value => ({ ...value, nextDueDate }))}/></label><label className="text-xs text-muted-foreground">Интервал, дней<input aria-label="Интервал в днях" type="number" min="1" max="3650" value={form.intervalDays} onChange={event => setForm(value => ({ ...value, intervalDays: event.target.value }))} className={INP}/></label></div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.reminderEnabled} onChange={event => setForm(value => ({ ...value, reminderEnabled: event.target.checked }))}/> Напоминать о проверке</label>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">За сколько дней<input aria-label="Дней до срока" type="number" min="0" max="365" value={form.leadDays} onChange={event => setForm(value => ({ ...value, leadDays: event.target.value }))} className={INP}/></label><label className="text-xs text-muted-foreground">Время<input aria-label="Время напоминания" type="time" value={form.time} onChange={event => setForm(value => ({ ...value, time: event.target.value }))} className={INP}/></label></div>
      <textarea aria-label="Заметки к контролю" value={form.notes} maxLength={1000} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} placeholder="Заметки (необязательно)" rows={2} className={INP}/>
      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Сохранить</button></div>
    </div>}
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Пока ничего не добавлено. Создайте список показателей и проверок, которые хотите контролировать.</div> : <div className="space-y-2">{items.map(item => {
      const remaining = daysUntil(item.nextDueDate);
      return <article key={item.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{item.kind === "measurement" ? <Activity size={17}/> : <CalendarClock size={17}/>}</div>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-medium">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">Следующая проверка: {item.nextDueDate}{item.unit ? ` · ${item.unit}` : ""}</p><p className={`mt-1 text-xs ${remaining < 0 ? "text-red-600" : remaining <= 7 ? "text-amber-700" : "text-muted-foreground"}`}>{remaining < 0 ? `Просрочено на ${Math.abs(remaining)} дн.` : remaining === 0 ? "Сегодня" : `Через ${remaining} дн.`}</p>{item.lastCheckedDate && <p className="mt-1 text-[10px] text-muted-foreground">Последняя проверка: {item.lastCheckedDate}</p>}{item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}</div>
        <div className="flex flex-col gap-1"><button type="button" title="Отметить выполненным" aria-label={`Отметить ${item.name} выполненным`} onClick={() => markDone(item)} className="rounded-lg border p-1.5 text-emerald-700"><Check size={14}/></button><button type="button" title="Удалить" aria-label={`Удалить ${item.name}`} onClick={() => { if (window.confirm("Удалить этот пункт контроля?")) setItems(previous => previous.filter(value => value.id !== item.id)); }} className="rounded-lg border p-1.5 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div>
      </article>;
    })}</div>}
    <p className="text-[10px] leading-relaxed text-muted-foreground">Уведомления браузера отправляются, пока приложение открыто и браузер разрешил уведомления. Для надёжных уведомлений при закрытом приложении понадобится отдельная push-инфраструктура.</p>
  </section>;
}
