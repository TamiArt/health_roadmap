import { useMemo, useState } from "react";
import { getLabStages } from "./labCatalog";
import { buildLabHistory, filterLabHistory } from "./labHistoryModel";
import { usePersistentState } from "./storage";

export function MedicalHistoryTab({ storagePrefix = "" }: { storagePrefix?: string }) {
  const [measurements, , ready, error] = usePersistentState<Record<string, { id: string; date: string; value: string; unit: string }[]>>(`${storagePrefix}labMeasurements`, {});
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const stages = useMemo(() => getLabStages(), []);
  const entries = useMemo(() => buildLabHistory(measurements, stages), [measurements, stages]);
  const filtered = useMemo(() => filterLabHistory(entries, { query, fromDate, toDate }), [entries, query, fromDate, toDate]);
  if (!ready) return <p className="py-6 text-sm text-muted-foreground">Загрузка истории анализов…</p>;
  if (error) return <p role="alert" className="py-6 text-sm text-red-600">{error}</p>;
  return (
    <section aria-label="История результатов анализов">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <label className="text-xs text-muted-foreground">Поиск по исследованию или результату
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название, значение, единица" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">С даты
          <input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">По дату
          <input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">Найдено записей: {filtered.length}</p>
        {(query || fromDate || toDate) && <button type="button" onClick={() => { setQuery(""); setFromDate(""); setToDate(""); }} className="text-xs text-primary hover:underline">Сбросить фильтры</button>}
      </div>
      {filtered.length ? <ol className="space-y-2">
        {filtered.map(entry => <li key={entry.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{entry.testName}</p><p className="text-[11px] text-muted-foreground mt-0.5">{entry.stageLabel}</p></div>
            <time dateTime={entry.date} className="text-xs text-muted-foreground">{new Date(`${entry.date}T00:00:00`).toLocaleDateString("ru-RU")}</time>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{entry.value}{entry.unit ? ` ${entry.unit}` : ""}</p>
        </li>)}
      </ol> : <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{entries.length ? "По выбранным фильтрам записей нет." : "Сохранённых результатов анализов пока нет."}</p>
        <p className="text-xs text-muted-foreground mt-1">Добавленные вручную результаты появятся здесь автоматически.</p>
      </div>}
      <p className="text-[11px] text-muted-foreground mt-4">История показывает введённые значения без клинической оценки и без сравнения результатов с разными единицами измерения.</p>
    </section>
  );
}
