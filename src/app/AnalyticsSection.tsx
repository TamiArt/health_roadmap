import { useMemo, useState } from "react";
import { Activity, Baby, FileText, Syringe, UserRound } from "lucide-react";
import { VACCINES } from "./healthData";
import { getLabStages } from "./labCatalog";
import { buildDentalSummary, buildVaccineSummary } from "./analyticsModel";
import { buildAnalyticsSeries, filterAnalyticsSeries, getReferenceStatus, getSeriesChange, type AnalyticsCategory } from "./analyticsModel";
import { LabIndicatorTrend } from "./LabIndicatorTrend";
import type { Child, DentalRecord, Section, VaccineStatus } from "./models";
import type { HealthMonitoringItem, LabResultEntry, VaccineAdministration } from "./healthRecords";
import { childAgeVaccines, CURRENT_YEAR } from "./shared";
import { usePersistentState } from "./storage";

function ProfileAnalytics({ child, onNavigate, onOpenSource }: { child?: Child; onNavigate: (section: Section) => void; onOpenSource: (source: "lab-result" | "manual" | "monitoring", sourceId: string, pointId: string, profileId: string | null) => void }) {
  const age = child ? Math.max(0, CURRENT_YEAR - child.birthYear) : undefined;
  const vaccines = child ? childAgeVaccines(age ?? 0) : VACCINES;
  const prefix = child ? `childHealth:${child.id}:` : "";
  const [statuses, , statusesReady, statusesError] = usePersistentState<Record<string, VaccineStatus>>(
    child ? `${prefix}vaccineStatuses` : "vaccineStatuses",
    Object.fromEntries(vaccines.map(item => [item.id, item.status])),
  );
  const [measurements, , measurementsReady, measurementsError] = usePersistentState<Record<string, import("./models").LabMeasurement[]>>(
    `${prefix}labMeasurements`, {},
  );
  const [results, , resultsReady, resultsError] = usePersistentState<LabResultEntry[]>(`${prefix}labResultEntries`, []);
  const [monitoring, , monitoringReady, monitoringError] = usePersistentState<HealthMonitoringItem[]>(`${prefix}healthMonitoring`, []);
  const [dental, , dentalReady, dentalError] = usePersistentState<Record<number, DentalRecord>>(
    child ? `${prefix}toothData` : "adultToothData", {},
  );
  const [vaccineRecords, , vaccineRecordsReady, vaccineRecordsError] = usePersistentState<VaccineAdministration[]>(
    `${prefix}vaccineRecords`, [],
  );
  const [category, setCategory] = useState<AnalyticsCategory>("all");
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const testNames = useMemo(() => new Map(getLabStages().flatMap(stage => stage.tests.map(test => [test.id, test.name] as const))), []);
  const series = useMemo(() => buildAnalyticsSeries(results, measurements, testNames, monitoring), [results, measurements, testNames, monitoring]);
  const visibleSeries = useMemo(() => filterAnalyticsSeries(series, { category, query, fromDate, toDate }), [series, category, query, fromDate, toDate]);
  const vaccineSummary = buildVaccineSummary(vaccines, statuses);
  const dentalSummary = buildDentalSummary(dental);
  const measurementCount = series.reduce((count, item) => count + item.points.length, 0);
  const errors = [statusesError, measurementsError, resultsError, monitoringError, dentalError, vaccineRecordsError].filter(Boolean);
  const ready = statusesReady && measurementsReady && resultsReady && monitoringReady && dentalReady && vaccineRecordsReady;

  if (!ready) return <div role="status" className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Загрузка аналитики профиля…</div>;
  if (errors.length) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{errors[0]}</div>;

  const metrics = [
    { label: "Измерения с числовыми значениями", value: String(measurementCount), icon: Activity },
    { label: "Показатели с историей", value: String(series.filter(item => item.points.length > 1).length), icon: FileText },
    { label: "Вакцинации в истории", value: String(vaccineRecords.length), icon: Syringe },
    { label: "Стоматологические записи", value: String(dentalSummary.recorded), icon: UserRound },
  ];
  return <div className="space-y-5">
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="mb-1 flex items-center gap-2 text-primary">{child ? <Baby size={16}/> : <UserRound size={16}/>}<span className="text-xs font-semibold uppercase tracking-wide">{child ? "Детский профиль" : "Взрослый профиль"}</span></div>
      <h2 className="text-lg font-bold text-foreground">{child ? child.name : "Мои данные"}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{child ? `Возраст: ${age} · год рождения: ${child.birthYear}` : "Данные отображаются только из взрослого профиля."}</p>
    </div>
    <div className="grid grid-cols-2 gap-3">{metrics.map(({label,value,icon:Icon}) => <div key={label} className="rounded-xl border border-border bg-card p-4"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{label}</span><Icon size={15} className="shrink-0 text-primary"/></div><p className="text-2xl font-bold text-foreground">{value}</p></div>)}</div>
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">Динамика показателей</h3><p className="text-[11px] text-muted-foreground">Числовые результаты объединяются только при совпадении названия показателя и единицы измерения.</p></div><span className="text-[11px] text-muted-foreground">{visibleSeries.length} серий</span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">Категория<select value={category} onChange={event => setCategory(event.target.value as AnalyticsCategory)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"><option value="all">Все показатели</option><option value="laboratory">Лабораторные анализы</option><option value="monitoring">Измерения и наблюдения</option></select></label>
        <label className="text-xs text-muted-foreground">Поиск по показателю<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название или единица" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"/></label>
        <label className="text-xs text-muted-foreground">Дата с<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"/></label>
        <label className="text-xs text-muted-foreground">Дата по<input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"/></label>
      </div>
      {visibleSeries.length === 0 ? <p className="mt-4 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">{series.length ? "Нет показателей, подходящих под фильтры." : "Пока нет числовых результатов для построения графиков. Добавьте результаты анализов или измерения в соответствующем разделе."}</p> :
        <div className="mt-4 space-y-3">{visibleSeries.map(item => {
          const change = getSeriesChange(item.points);
          const latest = item.points[item.points.length - 1];
          const status = getReferenceStatus(latest.value, latest.referenceRange);
          const statusLabel = status === "low" ? "Ниже указанного референса" : status === "high" ? "Выше указанного референса" : status === "normal" ? "В пределах указанного референса" : "Референс не указан";
          return <article key={item.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-sm font-semibold text-foreground">{item.name}</h4><p className="text-[11px] text-muted-foreground">{item.category === "laboratory" ? "Лабораторный показатель" : "Измерение / наблюдение"} · {item.unit}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">{statusLabel}</span></div>
            <p className="mt-2 text-xs text-foreground">Последнее значение: <strong>{new Intl.NumberFormat("ru-RU",{maximumFractionDigits:3}).format(latest.value)} {item.unit}</strong> · {new Date(`${latest.date}T00:00:00`).toLocaleDateString("ru-RU")}</p>
            {change && <p className="mt-1 text-[11px] text-muted-foreground">Изменение за период: {change.delta > 0 ? "+" : ""}{new Intl.NumberFormat("ru-RU",{maximumFractionDigits:3}).format(change.delta)} {item.unit}{change.percent === null ? "" : ` (${change.percent > 0 ? "+" : ""}${change.percent.toFixed(1)}%)`}</p>}
            <LabIndicatorTrend name={item.name} unit={item.unit} points={item.points} referenceRange={latest.referenceRange}/>
            <div className="mt-3 space-y-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Исходные результаты</p>{item.points.slice().reverse().map(point => <div key={point.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 py-2 text-xs"><span>{new Date(`${point.date}T00:00:00`).toLocaleDateString("ru-RU")} · {point.sourceLabel}</span><span className="font-semibold">{new Intl.NumberFormat("ru-RU",{maximumFractionDigits:3}).format(point.value)} {point.unit}</span><button type="button" onClick={() => onOpenSource(point.source, point.sourceId, point.id, child?.id ?? null)} className="font-medium text-primary hover:underline">Открыть запись</button></div>)}</div>
            {item.category === "laboratory" && <button type="button" onClick={() => onNavigate("health")} className="mt-2 text-xs font-medium text-primary hover:underline">Открыть историю анализов →</button>}
          </article>;
        })}</div>}
    </section>
    <section className="rounded-xl border border-border bg-card p-4"><h3 className="mb-2 text-sm font-semibold">Сводка профиля</h3><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{vaccineSummary.done}/{vaccineSummary.total} прививок отмечено выполненными</span><span>{vaccineSummary.overdue} со статусом «просрочено»</span><span>{dentalSummary.attention} стоматологических записей требуют внимания</span></div></section>
    <p className="text-[10px] text-muted-foreground">Аналитика показывает сохранённые значения и введённые пользователем референсы. Она не интерпретирует клиническую значимость изменений, не ставит диагнозы и не заменяет оценку врача. Загруженные PDF и изображения автоматически не распознаются.</p>
  </div>;
}

export function AnalyticsSection({ children, onNavigate, onOpenSource }: { children: Child[]; onNavigate: (section: Section) => void; onOpenSource: (source: "lab-result" | "manual" | "monitoring", sourceId: string, pointId: string, profileId: string | null) => void }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const selectedChild = children.find(child => child.id === selectedChildId);
  const activeChildId = selectedChild?.id ?? null;
  return <div className="mx-auto min-w-0 w-full max-w-5xl overflow-x-hidden p-4 sm:p-8">
    <h1 className="mb-1 text-2xl font-bold text-foreground" style={{fontFamily:"'Playfair Display', serif"}}>Аналитика здоровья</h1>
    <p className="mb-5 text-sm text-muted-foreground">Графики и сравнение сохранённых медицинских показателей во времени</p>
    <div className="mb-5 flex flex-wrap gap-2" aria-label="Выбор профиля для аналитики">
      <button type="button" aria-pressed={!activeChildId} onClick={() => setSelectedChildId(null)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${!activeChildId ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>Взрослый профиль</button>
      {children.map(child => <button key={child.id} type="button" aria-pressed={activeChildId === child.id} onClick={() => setSelectedChildId(child.id)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${activeChildId === child.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{child.emoji} {child.name}</button>)}
    </div>
    {selectedChildId && !selectedChild && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Выбранный профиль больше не существует. Показан взрослый профиль.</p>}
    <ProfileAnalytics key={activeChildId ?? "adult"} child={selectedChild} onNavigate={onNavigate} onOpenSource={onOpenSource}/>
    <button type="button" onClick={() => onNavigate("health")} className="mt-5 text-xs font-medium text-primary hover:underline">Открыть раздел «Здоровье» →</button>
  </div>;
}
