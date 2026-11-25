import { VACCINES } from "./healthData";
import type { VaccineRecord, VaccineStatus } from "./models";
import { childAgeVaccines } from "./shared";
import { VaccineHistoryPanel } from "./VaccineHistoryPanel";

const VACCINE_STATUS_CFG: Record<VaccineStatus, { label:string; bg:string; text:string }> = {
  done:           { label:"Сделана",       bg:"bg-emerald-100", text:"text-emerald-700" },
  due:            { label:"Нужна",         bg:"bg-amber-100",   text:"text-amber-700"   },
  overdue:        { label:"Просрочена",    bg:"bg-red-100",     text:"text-red-700"     },
  not_applicable: { label:"Не актуальна", bg:"bg-slate-100",   text:"text-slate-500"   },
};

export function VaccinesTab({
  statuses, setStatuses, filterAge, recordsStorageKey,
}: {
  statuses: Record<string, VaccineStatus>;
  setStatuses: (v: Record<string, VaccineStatus>) => void;
  filterAge?: number;
  recordsStorageKey?: string;
}) {
  const vaccines = filterAge !== undefined ? childAgeVaccines(filterAge) : VACCINES;
  const mandatory = vaccines.filter(v => v.mandatory);
  const recommended = vaccines.filter(v => !v.mandatory);
  const countDone = (list: VaccineRecord[]) => list.filter(v => statuses[v.id]==="done").length;
  function cycle(id: string) {
    const order: VaccineStatus[] = ["done","due","overdue","not_applicable"];
    setStatuses({ ...statuses, [id]: order[(order.indexOf(statuses[id]??order[1])+1)%order.length] });
  }

  function VCard({ v }: { v: VaccineRecord }) {
    const s = statuses[v.id]??"due";
    const cfg = VACCINE_STATUS_CFG[s];
    return (
      <div className={`bg-card border rounded-xl p-4 ${v.mandatory&&s!=="done"&&s!=="not_applicable"?"border-red-200/60":"border-border"}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{v.name}</span>
            {v.mandatory && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Обязательная</span>}
          </div>
          <button type="button" aria-label={`Изменить статус вакцины «${v.name}». Текущий статус: ${cfg.label}`} onClick={() => cycle(v.id)} className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${cfg.bg} ${cfg.text}`}>{cfg.label}</button>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{v.protects}</p>
        <p className="text-[11px] text-muted-foreground/70 italic mb-1" style={{ fontFamily:"'DM Mono', monospace" }}>{v.schedule}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{v.note}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
        Нажмите на статус вакцины для изменения. Национальный календарь РФ + рекомендации ВОЗ.
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Обязательных</p>
          <p className="text-xl font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{countDone(mandatory)}/{mandatory.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-0.5">Рекомендованных</p>
          <p className="text-xl font-bold text-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{countDone(recommended)}/{recommended.length}</p>
        </div>
      </div>
      {mandatory.length>0 && <>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Обязательные</p>
        <div className="space-y-2 mb-5">{mandatory.map(v=><VCard key={v.id} v={v}/>)}</div>
      </>}
      {recommended.length>0 && <>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Рекомендованные</p>
        <div className="space-y-2">{recommended.map(v=><VCard key={v.id} v={v}/>)}</div>
      </>}
      <VaccineHistoryPanel vaccines={vaccines} storageKey={recordsStorageKey}/>
    </div>
  );
}
