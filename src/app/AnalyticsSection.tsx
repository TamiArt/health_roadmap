import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, FileText, Syringe, Activity, Baby, UserRound } from "lucide-react";
import { VACCINES } from "./healthData";
import { getLabStages } from "./labCatalog";
import { buildDentalSummary, buildRecentMeasurements, buildVaccineSummary } from "./analyticsModel";
import type { Child, DentalRecord, LabMeasurement, Section, UploadedResult, VaccineStatus } from "./models";
import { childAgeVaccines, CURRENT_YEAR } from "./shared";
import { usePersistentState } from "./storage";

type ProfileProps = { child?: Child };

function ProfileAnalytics({ child }: ProfileProps) {
  const age = child ? Math.max(0, CURRENT_YEAR - child.birthYear) : undefined;
  const vaccines = child ? childAgeVaccines(age ?? 0) : VACCINES;
  const prefix = child ? `childHealth:${child.id}:` : "";
  const vaccineKey = child ? `${prefix}vaccineStatuses` : "vaccineStatuses";
  const dentalKey = child ? `${prefix}toothData` : "adultToothData";
  const uploadsKey = child ? `${prefix}labUploads` : "labUploads";
  const measurementsKey = child ? `${prefix}labMeasurements` : "labMeasurements";

  const [vaccineStatuses, , vaccineReady, vaccineError] = usePersistentState<Record<string, VaccineStatus>>(
    vaccineKey, Object.fromEntries(vaccines.map(vaccine => [vaccine.id, vaccine.status]))
  );
  const [measurements, , measurementsReady, measurementsError] = usePersistentState<Record<string, LabMeasurement[]>>(measurementsKey, {});
  const [uploads, , uploadsReady, uploadsError] = usePersistentState<Record<string, UploadedResult[]>>(uploadsKey, {});
  const [dentalRecords, , dentalReady, dentalError] = usePersistentState<Record<number, DentalRecord>>(dentalKey, {});

  const testNames = useMemo(() => {
    const names = new Map<string, string>();
    getLabStages().forEach(stage => stage.tests.forEach(test => names.set(test.id, test.name)));
    return names;
  }, []);
  const vaccineSummary = buildVaccineSummary(vaccines, vaccineStatuses);
  const dentalSummary = buildDentalSummary(dentalRecords);
  const recentMeasurements = buildRecentMeasurements(measurements, testNames, 6);
  const measurementCount = Object.values(measurements).reduce((total, items) => total + items.length, 0);
  const uploadCount = Object.values(uploads).reduce((total, items) => total + items.length, 0);

  const errors = [vaccineError, measurementsError, uploadsError, dentalError].filter(Boolean);
  if (!vaccineReady || !measurementsReady || !uploadsReady || !dentalReady) {
    return <div role="status" className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Загрузка данных профиля…</div>;
  }
  if (errors.length) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{errors[0]}</div>;

  const metrics = [
    { label: "Прививки выполнены", value: `${vaccineSummary.done}/${vaccineSummary.total}`, detail: vaccineSummary.overdue ? `${vaccineSummary.overdue} со статусом «просрочено»` : `${vaccineSummary.due} ожидают`, icon: Syringe },
    { label: "Результаты анализов", value: String(measurementCount), detail: `${Object.keys(measurements).filter(id => (measurements[id] ?? []).length > 0).length} исследований с записями`, icon: Activity },
    { label: "Загруженные файлы", value: String(uploadCount), detail: "Файлы результатов в профиле", icon: FileText },
    { label: "Стоматологические записи", value: String(dentalSummary.recorded), detail: dentalSummary.attention ? `${dentalSummary.attention} записей со статусом, отличным от «здоров»` : "Нет отмеченных проблемных статусов", icon: UserRound },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-primary mb-1">
          {child ? <Baby size={16}/> : <UserRound size={16}/>}
          <span className="text-xs font-semibold uppercase tracking-wide">{child ? "Детский профиль" : "Взрослый профиль"}</span>
        </div>
        <h2 className="text-lg font-bold text-foreground">{child ? child.name : "Мои данные"}</h2>
        <p className="text-xs text-muted-foreground mt-1">{child ? `Возраст: ${age} · год рождения: ${child.birthYear}` : "Показатели рассчитаны по данным, сохранённым во взрослом профиле."}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map(({label,value,detail,icon:Icon}) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <Icon size={15} className="text-primary shrink-0"/>
            </div>
            <p className="text-2xl font-bold text-foreground" style={{fontFamily:"'DM Mono', monospace"}}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Syringe size={15} className="text-primary"/>
          <h3 className="text-sm font-semibold text-foreground">Статусы вакцинации</h3>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
          <div className="h-full rounded-full bg-primary transition-all" style={{width:`${vaccineSummary.total ? vaccineSummary.done / vaccineSummary.total * 100 : 0}%`}}/>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{vaccineSummary.done}</strong> выполнено</span>
          <span><strong className="text-foreground">{vaccineSummary.due}</strong> ожидает</span>
          <span><strong className="text-foreground">{vaccineSummary.overdue}</strong> просрочено</span>
          <span><strong className="text-foreground">{vaccineSummary.notApplicable}</strong> не применяется</span>
        </div>
        {vaccineSummary.overdue > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0"/> Это только сохранённые в приложении статусы, а не проверка медицинских показаний или актуальности календаря.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={15} className="text-primary"/>
          <h3 className="text-sm font-semibold text-foreground">Последние результаты анализов</h3>
        </div>
        {recentMeasurements.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">В этом профиле пока нет сохранённых результатов анализов.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentMeasurements.map(item => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.testName}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(`${item.date}T00:00:00`).toLocaleDateString("ru-RU")}</p>
                </div>
                <span className="text-sm font-semibold text-foreground" style={{fontFamily:"'DM Mono', monospace"}}>{item.value}{item.unit ? ` ${item.unit}` : ""}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground">Показаны введённые вручную значения. Результаты из загруженных файлов автоматически не распознаются.</p>
      </section>

      <p className="text-[10px] text-muted-foreground">Сводка отражает только записи, сохранённые в выбранном профиле. Она не рассчитывает общий балл здоровья и не формирует диагнозы или персональные медицинские рекомендации.</p>
    </div>
  );
}

export function AnalyticsSection({ children, onNavigate }: { children: Child[]; onNavigate: (section: Section) => void }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const selectedChild = children.find(child => child.id === selectedChildId);
  const profileKey = selectedChild?.id ?? "adult";

  return (
    <div className="p-5 sm:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{fontFamily:"'Playfair Display', serif"}}>Аналитика здоровья</h1>
      <p className="text-sm text-muted-foreground mb-5">Сводка по сохранённым данным выбранного профиля</p>
      <div className="flex flex-wrap gap-2 mb-5" aria-label="Выбор профиля для аналитики">
        <button type="button" aria-pressed={!selectedChildId} onClick={() => setSelectedChildId(null)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${!selectedChildId ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>Взрослый профиль</button>
        {children.map(child => (
          <button key={child.id} type="button" aria-pressed={selectedChildId === child.id} onClick={() => setSelectedChildId(child.id)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${selectedChildId === child.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{child.emoji} {child.name}</button>
        ))}
      </div>
      {selectedChildId && !selectedChild && (
        <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Выбранный профиль больше не существует. Показан взрослый профиль.</p>
      )}
      <ProfileAnalytics key={profileKey} child={selectedChild}/>
      <button type="button" onClick={() => onNavigate("health")} className="mt-5 text-xs font-medium text-primary hover:underline">Открыть раздел «Здоровье» →</button>
    </div>
  );
}
