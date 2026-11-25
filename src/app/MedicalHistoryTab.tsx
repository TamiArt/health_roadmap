import { useMemo, useState } from "react";
import { getLabStages } from "./labCatalog";
import { usePersistentState } from "./storage";
import type { DentalRecord, FamilyEvent, LabMeasurement, UploadedResult } from "./models";
import type { FamilyDate, HealthEvent, HealthMonitoringItem, LabResultEntry, VaccineAdministration } from "./healthRecords";
import { buildMedicalHistory, filterMedicalHistory, type MedicalHistoryKind, type MedicalHistorySource } from "./medicalHistoryModel";

const KIND_LABELS: Record<MedicalHistoryKind, string> = {
  analysis: "Анализы",
  manual: "Ручные измерения",
  event: "Медицинские события",
  vaccine: "Вакцинация",
  dental: "Стоматология",
  monitoring: "Контроль показателей",
  document: "Документы",
  family: "Семейная история",
};

export function MedicalHistoryTab({
  storagePrefix = "",
  dentalStorageKey,
  vaccineRecordsStorageKey,
  profileId = storagePrefix.match(/^childHealth:([^:]+):/)?.[1] ?? "adult",
  profileLabel = profileId === "adult" ? "Взрослый профиль" : "Профиль ребёнка",
  onOpenSource,
}: {
  storagePrefix?: string;
  dentalStorageKey?: string;
  vaccineRecordsStorageKey?: string;
  profileId?: string;
  profileLabel?: string;
  onOpenSource?: (source: MedicalHistorySource) => void;
}) {
  const [measurements, , measurementsReady, measurementsError, measurementsConflict] =
    usePersistentState<Record<string, LabMeasurement[]>>(`${storagePrefix}labMeasurements`, {});
  const [uploads, , uploadsReady, uploadsError, uploadsConflict] =
    usePersistentState<Record<string, UploadedResult[]>>(`${storagePrefix}labUploads`, {});
  const [labResults, , resultsReady, resultsError, resultsConflict] =
    usePersistentState<LabResultEntry[]>(`${storagePrefix}labResultEntries`, []);
  const [events, , eventsReady, eventsError, eventsConflict] =
    usePersistentState<HealthEvent[]>(`${storagePrefix}healthEvents`, []);
  const [vaccines, , vaccinesReady, vaccinesError, vaccinesConflict] =
    usePersistentState<VaccineAdministration[]>(vaccineRecordsStorageKey ?? `${storagePrefix}vaccineRecords`, []);
  const [dental, , dentalReady, dentalError, dentalConflict] =
    usePersistentState<Record<number, DentalRecord>>(dentalStorageKey ?? (storagePrefix ? `${storagePrefix}toothData` : "adultToothData"), {});
  const [monitoring, , monitoringReady, monitoringError, monitoringConflict] =
    usePersistentState<HealthMonitoringItem[]>(`${storagePrefix}healthMonitoring`, []);
  const [familyEvents, , familyReady, familyError, familyConflict] =
    usePersistentState<FamilyDate[]>("familyEvents", []);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MedicalHistoryKind | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const stages = useMemo(() => getLabStages(), []);
  const ready = measurementsReady && uploadsReady && resultsReady && eventsReady && vaccinesReady && dentalReady && monitoringReady && familyReady;
  const error = measurementsError ?? uploadsError ?? resultsError ?? eventsError ?? vaccinesError ?? dentalError ?? monitoringError ?? familyError;
  const conflict = measurementsConflict || uploadsConflict || resultsConflict || eventsConflict || vaccinesConflict || dentalConflict || monitoringConflict || familyConflict;
  const entries = useMemo(() => buildMedicalHistory({
    profileId,
    profileLabel,
    storagePrefix,
    dentalStorageKey,
    vaccineRecordsStorageKey,
    measurements,
    uploads,
    stages,
    labResults,
    events,
    vaccines,
    dental,
    monitoring,
    familyEvents: profileId === "adult" ? familyEvents as FamilyEvent[] : [],
  }), [profileId, profileLabel, storagePrefix, dentalStorageKey, vaccineRecordsStorageKey, measurements, uploads, stages, labResults, events, vaccines, dental, monitoring, familyEvents]);
  const filtered = useMemo(() => filterMedicalHistory(entries, {
    query, kind, profileId: "all", fromDate, toDate, sort,
  }), [entries, query, kind, fromDate, toDate, sort]);

  if (!ready) return <p role="status" aria-busy="true" className="py-6 text-sm text-muted-foreground">Загрузка медицинской истории…</p>;
  if (error) return <p role="alert" className="py-6 text-sm text-red-600">{error}</p>;

  return (
    <section aria-label="Единая медицинская история" className="space-y-3">
      <p className="text-xs text-muted-foreground">Профиль: <strong className="font-medium text-foreground">{profileLabel}</strong></p>
      {conflict && <p role="status" aria-live="polite" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">Данные изменены в другой вкладке. Показана последняя сохранённая версия; повторите последнее действие, если оно не сохранилось.</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Поиск по всей истории
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название, показатель, учреждение, заметка" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">Категория
          <select aria-label="Тип медицинской записи" value={kind} onChange={event => setKind(event.target.value as MedicalHistoryKind | "all")} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground">
            <option value="all">Все категории</option>
            {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">С даты
          <input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
        <label className="text-xs text-muted-foreground">По дату
          <input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Найдено записей: {filtered.length} из {entries.length}</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="medical-history-sort">Сортировка</label>
          <select id="medical-history-sort" value={sort} onChange={event => setSort(event.target.value as "newest" | "oldest")} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground">
            <option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option>
          </select>
          {(query || kind !== "all" || fromDate || toDate || sort !== "newest") && <button type="button" onClick={() => { setQuery(""); setKind("all"); setFromDate(""); setToDate(""); setSort("newest"); }} className="text-xs text-primary hover:underline">Сбросить</button>}
        </div>
      </div>
      {filtered.length ? <ol className="space-y-2">
        {filtered.map(entry => <li key={entry.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{entry.title}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{KIND_LABELS[entry.kind]} · {entry.profileLabel}</p></div>
            <span className="text-xs text-muted-foreground">{entry.dateLabel}</span>
          </div>
          {entry.details && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{entry.details}</p>}
          {onOpenSource && <button type="button" onClick={() => onOpenSource(entry.source)} className="mt-2 text-xs font-medium text-primary hover:underline">Открыть исходную запись</button>}
        </li>)}
      </ol> : <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">{entries.length ? "По выбранным фильтрам записей нет." : "Медицинская история пока пуста."}</p>
        <p className="mt-1 text-xs text-muted-foreground">Записи появятся здесь после добавления в соответствующих разделах здоровья.</p>
      </div>}
      <p className="mt-2 text-[11px] text-muted-foreground">История объединяет записи без клинической интерпретации. Частичные даты (год, месяц, сезон) сохраняют исходную точность; записи без даты располагаются после датированных событий.</p>
    </section>
  );
}
