import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, ChevronRight, FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { HEALTH_ROADMAP, LIFE_STAGES, VACCINES, type LifeStage, type ToothStatus, type UploadedResult, type LabMeasurement, type VaccineRecord, type VaccineStatus } from "./data";
import { childAgeVaccines, createId, validateLabMeasurement, validateLabUpload } from "./shared";
import { usePersistentState } from "./storage";

// ─── Lab Tests Tab ────────────────────────────────────────────────────────────

export function LabTestsTab({ stages, defaultGender = "f", storageKey = "labUploads" }: { stages?: LifeStage[]; defaultGender?: "f"|"m"; storageKey?: string }) {
  const [gender, setGender] = useState<"f"|"m">(defaultGender);
  const [openStage, setOpenStage] = useState<string|null>(null);
  const [uploads, setUploads, uploadsReady, uploadsError, uploadsConflict] = usePersistentState<Record<string, UploadedResult[]>>(storageKey, {});
  const [measurements, setMeasurements, measurementsReady, measurementsError, measurementsConflict] = usePersistentState<Record<string, LabMeasurement[]>>(storageKey.replace(/labUploads$/, "labMeasurements"), {});
  const [measurementTestId, setMeasurementTestId] = useState<string | null>(null);
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [measurementDate, setMeasurementDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  });
  const [measurementValue, setMeasurementValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingId = useRef<string|null>(null);
  const objectUrls = useMemo(() => {
    const urls = new Map<string, string>();
    Object.values(uploads).flat().forEach(upload => urls.set(upload.id, URL.createObjectURL(upload.blob)));
    return urls;
  }, [uploads]);

  useEffect(() => () => {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [objectUrls]);
  const allStages = stages ?? LIFE_STAGES;
  const currentDate = new Date();
  const todayIsoDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,"0")}-${String(currentDate.getDate()).padStart(2,"0")}`;

  function triggerUpload(testId: string) {
    if (!uploadsReady || uploadsError) return;
    pendingId.current = testId;
    fileRef.current?.click();
  }
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = pendingId.current;
    pendingId.current = null;
    if (!file || !id) { e.target.value = ""; return; }
    const validationError = validateLabUpload(file);
    if (validationError) {
      setUploadError(validationError);
      e.target.value = "";
      return;
    }
    setUploadError(null);
    const result: UploadedResult = {
      id:createId(),
      name:file.name,
      date:new Date().toLocaleDateString("ru-RU"),
      blob:file,
      isPdf:file.name.toLowerCase().endsWith(".pdf"),
    };
    setUploads(prev => ({ ...prev, [id]:[...(prev[id]??[]), result] }));
    e.target.value="";
  }

  function startMeasurement(testId: string, existing?: LabMeasurement) {
    setMeasurementTestId(testId);
    setEditingMeasurementId(existing?.id ?? null);
    setMeasurementValue(existing?.value ?? "");
    setMeasurementUnit(existing?.unit ?? "");
    setMeasurementError(null);
    const now = new Date();
    setMeasurementDate(existing?.date ?? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`);
  }

  function saveMeasurement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!measurementTestId || !measurementsReady || measurementsError) return;
    const validationError = validateLabMeasurement(measurementValue, measurementDate, measurementUnit);
    if (validationError) { setMeasurementError(validationError); return; }
    const record: LabMeasurement = { id: editingMeasurementId ?? createId(), date: measurementDate, value: measurementValue.trim(), unit: measurementUnit.trim() };
    setMeasurements(prev => ({
      ...prev,
      [measurementTestId]: [
        ...(prev[measurementTestId] ?? []).filter(item => item.id !== record.id),
        record,
      ].sort((a,b) => b.date.localeCompare(a.date)),
    }));
    setMeasurementTestId(null);
    setEditingMeasurementId(null);
    setMeasurementValue("");
    setMeasurementUnit("");
    setMeasurementError(null);
  }

  function removeMeasurement(testId: string, measurementId: string) {
    setMeasurements(prev => ({ ...prev, [testId]: (prev[testId] ?? []).filter(item => item.id !== measurementId) }));
  }

  function removeUpload(testId: string, uploadId: string) {
    setUploads(prev => ({ ...prev, [testId]:(prev[testId]??[]).filter(upload => upload.id!==uploadId) }));
  }

  const visibleStages = allStages.filter(s => s.tests.some(t => t.gender==="all" || t.gender===gender));
  const total = visibleStages.reduce((n,s) => n + s.tests.filter(t => t.gender==="all"||t.gender===gender).length, 0);

  return (
    <div>
      <input ref={fileRef} type="file" aria-label="Загрузить результат анализа" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,.pdf" className="hidden" onChange={handleFile} />
      {(uploadError || uploadsError || measurementsError) && <p role="alert" className="mb-3 text-xs text-red-600">{uploadError ?? uploadsError ?? measurementsError}</p>}
      {(uploadsConflict || measurementsConflict) && <p role="status" aria-live="polite" className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">Данные были изменены в другой вкладке. Загружена последняя сохранённая версия; ваше изменение не сохранено — повторите его.</p>}
      {!stages && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button onClick={() => setGender("f")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gender==="f"?"bg-card shadow-sm text-foreground":"text-muted-foreground"}`}>♀ Женщина</button>
            <button onClick={() => setGender("m")} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${gender==="m"?"bg-card shadow-sm text-foreground":"text-muted-foreground"}`}>♂ Мужчина</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px]"><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"/><span className="text-muted-foreground">Необходимо</span></span>
            <span className="flex items-center gap-1.5 text-[11px]"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"/><span className="text-muted-foreground">Желательно</span></span>
            <span className="text-xs text-muted-foreground">{total} анализов</span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {visibleStages.map(stage => {
          const filtered = stage.tests.filter(t => t.gender==="all"||t.gender===gender);
          if (!filtered.length) return null;
          const isOpen = openStage===stage.id;
          const uploadedCount = filtered.reduce((n,t) => n+(uploads[t.id]?.length??0)+(measurements[t.id]?.length??0), 0);
          return (
            <div key={stage.id} className={`bg-card rounded-xl border overflow-hidden ${stage.pinned?"border-amber-300/60":stage.current?"border-primary/30":"border-border"}`}>
              <button onClick={() => setOpenStage(isOpen?null:stage.id)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0 ${stage.pinned?"bg-amber-100 border-amber-300 text-amber-800":stage.current?"bg-primary border-primary text-primary-foreground":"bg-muted border-border text-muted-foreground"}`} style={{ fontFamily:"'DM Mono', monospace" }}>
                    {stage.pinned?"★":stage.age.slice(0,2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${stage.pinned?"text-amber-800":stage.current?"text-primary":"text-foreground"}`}>{stage.label}</span>
                      <span className="text-xs text-muted-foreground">{stage.age}</span>
                      {stage.current && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Сейчас</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedCount>0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{uploadedCount} результатов</span>}
                  <span className="text-xs text-muted-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{filtered.length}</span>
                  <ChevronRight size={13} className={`text-muted-foreground transition-transform ${isOpen?"rotate-90":""}`} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border divide-y divide-border/60">
                  {filtered.map(test => {
                    const ups = uploads[test.id]??[];
                    const values = measurements[test.id]??[];
                    const isRec = test.priority === "r";
                    return (
                      <div key={test.id} className="px-4 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{test.name}</span>
                              {isRec
                                ? <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700">желательно</span>
                                : <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-700">необходимо</span>}
                              {test.gender!=="all" && <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${test.gender==="f"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>{test.gender==="f"?"♀":"♂"}</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{test.what}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1 italic" style={{ fontFamily:"'DM Mono', monospace" }}>{test.frequency}</p>
                            {(ups.length>0 || values.length>0) && (
                              <div className="mt-2 space-y-1">
                                {values.map(item => (
                                  <div key={item.id} className="flex items-center gap-2 bg-emerald-50/70 rounded-lg px-3 py-2">
                                    <span className="text-xs font-semibold text-foreground flex-1 min-w-0">{item.value}{item.unit ? ` ${item.unit}` : ""}</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily:"'DM Mono', monospace" }}>{new Date(`${item.date}T00:00:00`).toLocaleDateString("ru-RU")}</span>
                                    <button type="button" aria-label={`Изменить результат от ${item.date}`} onClick={() => startMeasurement(test.id, item)} className="text-[10px] text-primary hover:underline">Изменить</button>
                                    <button type="button" aria-label={`Удалить результат от ${item.date}`} onClick={() => removeMeasurement(test.id, item.id)}><X size={11} className="text-muted-foreground hover:text-foreground"/></button>
                                  </div>
                                ))}
                                {ups.map(r => (
                                  <div key={r.id} className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                                    {r.isPdf?<FileText size={12} className="text-primary shrink-0"/>:<ImageIcon size={12} className="text-primary shrink-0"/>}
                                    <a href={objectUrls.get(r.id)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate flex-1">{r.name}</a>
                                    <span className="text-[10px] text-muted-foreground shrink-0" style={{ fontFamily:"'DM Mono', monospace" }}>{r.date}</span>
                                    <button type="button" aria-label={`Удалить файл ${r.name}`} onClick={() => removeUpload(test.id, r.id)}><X size={11} className="text-muted-foreground hover:text-foreground"/></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col gap-1.5">
                            <button type="button" onClick={() => startMeasurement(test.id)} disabled={!measurementsReady || !!measurementsError} className="flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-50">+ Значение</button>
                            <button type="button" onClick={() => triggerUpload(test.id)} disabled={!uploadsReady || !!uploadsError} className="flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-all disabled:opacity-50">
                              <Upload size={11}/>Файл
                            </button>
                          </div>
                        </div>
                        {measurementTestId === test.id && (
                          <form onSubmit={saveMeasurement} className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                            <p className="text-xs font-semibold text-foreground">{editingMeasurementId ? "Редактирование результата анализа" : "Новый результат анализа"}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <label className="text-[11px] text-muted-foreground">Дата анализа
                                <input aria-label="Дата анализа" type="date" max={todayIsoDate} value={measurementDate} onChange={event => setMeasurementDate(event.target.value)} required className="mt-1 w-full min-w-0 text-xs px-2 py-1.5 rounded border border-border bg-card text-foreground"/>
                              </label>
                              <label className="text-[11px] text-muted-foreground">Значение
                                <input aria-label="Значение результата" type="text" maxLength={40} value={measurementValue} onChange={event => setMeasurementValue(event.target.value)} placeholder="Например, 5.4" required className="mt-1 w-full min-w-0 text-xs px-2 py-1.5 rounded border border-border bg-card text-foreground"/>
                              </label>
                              <label className="text-[11px] text-muted-foreground">Единицы измерения
                                <input aria-label="Единицы измерения" type="text" maxLength={20} value={measurementUnit} onChange={event => setMeasurementUnit(event.target.value)} placeholder="ммоль/л" className="mt-1 w-full min-w-0 text-xs px-2 py-1.5 rounded border border-border bg-card text-foreground"/>
                              </label>
                            </div>
                            {measurementError && <p role="alert" className="text-xs text-red-600">{measurementError}</p>}
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => { setMeasurementTestId(null); setEditingMeasurementId(null); setMeasurementError(null); }} className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground">Отмена</button>
                              <button type="submit" className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">{editingMeasurementId ? "Сохранить изменения" : "Сохранить результат"}</button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vaccines Tab ─────────────────────────────────────────────────────────────

const VACCINE_STATUS_CFG: Record<VaccineStatus, { label:string; bg:string; text:string }> = {
  done:           { label:"Сделана",       bg:"bg-emerald-100", text:"text-emerald-700" },
  due:            { label:"Нужна",         bg:"bg-amber-100",   text:"text-amber-700"   },
  overdue:        { label:"Просрочена",    bg:"bg-red-100",     text:"text-red-700"     },
  not_applicable: { label:"Не актуальна", bg:"bg-slate-100",   text:"text-slate-500"   },
};

export function VaccinesTab({
  statuses, setStatuses, filterAge,
}: {
  statuses: Record<string, VaccineStatus>;
  setStatuses: (v: Record<string, VaccineStatus>) => void;
  filterAge?: number;
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
    </div>
  );
}

// ─── Dental Tab ───────────────────────────────────────────────────────────────

const TOOTH_STATUS_CFG: Record<ToothStatus, { label:string; bg:string; text:string; fill:string }> = {
  healthy:   { label:"Здоров",        bg:"bg-emerald-500", text:"text-white",     fill:"#10b981" },
  caries:    { label:"Кариес",        bg:"bg-red-500",     text:"text-white",     fill:"#ef4444" },
  filled:    { label:"Пломба",        bg:"bg-blue-500",    text:"text-white",     fill:"#3b82f6" },
  crown:     { label:"Коронка",       bg:"bg-amber-400",   text:"text-white",     fill:"#fbbf24" },
  implant:   { label:"Имплант",       bg:"bg-violet-500",  text:"text-white",     fill:"#8b5cf6" },
  extracted: { label:"Удалён",        bg:"bg-slate-300",   text:"text-slate-600", fill:"#cbd5e1" },
  treatment: { label:"Нужно лечение", bg:"bg-orange-500",  text:"text-white",     fill:"#f97316" },
};

function toothLabel(n: number) {
  const pos=n%10, quad=Math.floor(n/10);
  const side=(quad===1||quad===4)?"правый":"левый";
  const jaw=quad<=2?"верхний":"нижний";
  const type=pos===8?"зуб мудрости":pos>=6?"моляр":pos>=4?"премоляр":pos===3?"клык":"резец";
  return `Зуб ${n} — ${jaw} ${side} ${type}`;
}

export function DentalTab({
  data, onChange,
}: {
  data: Record<number, { status:ToothStatus; note:string }>;
  onChange: (d: Record<number, { status:ToothStatus; note:string }>) => void;
}) {
  const [selected, setSelected] = useState<number|null>(null);
  const [note, setNote] = useState("");
  const UPPER=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const LOWER=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
  const pick = (n: number) => { setSelected(n); setNote(data[n]?.note??""); };
  const setStatus = (n: number, s: ToothStatus) => onChange({ ...data, [n]:{ status:s, note:data[n]?.note??"" } });
  const saveNote = () => { if (!selected) return; onChange({ ...data, [selected]:{ status:data[selected]?.status??"healthy", note } }); };

  function ToothCell({ n, upper }: { n:number; upper:boolean }) {
    const t=data[n]; const cfg=t?TOOTH_STATUS_CFG[t.status]:null; const isSel=selected===n;
    return (
      <button type="button" onClick={() => pick(n)} title={toothLabel(n)} aria-label={`${toothLabel(n)}${t ? `, статус: ${TOOTH_STATUS_CFG[t.status].label}` : ", статус не указан"}`} aria-pressed={isSel} style={{ flexDirection:upper?"column-reverse":"column" }} className="flex flex-col items-center gap-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        <div className={`w-6 h-8 flex items-center justify-center border-2 transition-all text-[8px] font-bold ${upper?"rounded-t-lg rounded-b-sm":"rounded-b-lg rounded-t-sm"} ${isSel?"ring-2 ring-offset-1 ring-primary border-primary":cfg?"border-transparent":"border-border"}`}
          style={{ backgroundColor:cfg?cfg.fill:"#f1f5f9", color:cfg?(t?.status==="extracted"?"#64748b":"#fff"):"#94a3b8" }}>
          {n%10}
        </div>
        <div className="w-1 h-2 rounded-full opacity-50" style={{ backgroundColor:cfg?cfg.fill:"#cbd5e1" }}/>
      </button>
    );
  }

  const selData = selected?data[selected]:null;
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(Object.keys(TOOTH_STATUS_CFG) as ToothStatus[]).map(s => {
          const c=TOOTH_STATUS_CFG[s];
          return <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
        })}
      </div>
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mb-3">Верхняя челюсть (FDI)</p>
        <div className="flex justify-center">
          <div className="flex gap-0.5">{UPPER.slice(0,8).map(n=><ToothCell key={n} n={n} upper={true}/>)}</div>
          <div className="w-3"/>
          <div className="flex gap-0.5">{UPPER.slice(8).map(n=><ToothCell key={n} n={n} upper={true}/>)}</div>
        </div>
        <div className="my-3 flex items-center gap-2">
          <div className="flex-1 border-t border-dashed border-border"/>
          <span className="text-[9px] text-muted-foreground whitespace-nowrap">линия смыкания</span>
          <div className="flex-1 border-t border-dashed border-border"/>
        </div>
        <div className="flex justify-center">
          <div className="flex gap-0.5">{LOWER.slice(0,8).map(n=><ToothCell key={n} n={n} upper={false}/>)}</div>
          <div className="w-3"/>
          <div className="flex gap-0.5">{LOWER.slice(8).map(n=><ToothCell key={n} n={n} upper={false}/>)}</div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest mt-3">Нижняя челюсть (FDI)</p>
      </div>
      {selected ? (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold text-foreground mb-2">{toothLabel(selected)}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(Object.keys(TOOTH_STATUS_CFG) as ToothStatus[]).map(s => {
              const c=TOOTH_STATUS_CFG[s];
              return <button key={s} type="button" aria-pressed={selData?.status===s} onClick={() => setStatus(selected,s)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selData?.status===s?`${c.bg} ${c.text}`:"bg-muted text-muted-foreground hover:bg-muted/80"}`}>{c.label}</button>;
            })}
          </div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} onBlur={saveNote} placeholder="Заметки: дата, врач, жалобы..." rows={2}
            className="w-full text-xs p-3 rounded-lg border border-border bg-muted/30 text-foreground resize-none focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60"
          />
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground py-5 bg-card border border-dashed border-border rounded-xl">
          Нажмите на зуб для просмотра и редактирования
        </div>
      )}
    </div>
  );
}

// ─── Health Section ───────────────────────────────────────────────────────────

export function HealthSection({
  vaccineStatuses, setVaccineStatuses,
}: {
  vaccineStatuses: Record<string, VaccineStatus>;
  setVaccineStatuses: (v: Record<string, VaccineStatus>) => void;
}) {
  const [tab, setTab] = useState<"roadmap"|"tests"|"vaccines"|"dental">("roadmap");
  const tabsId = useId();
  const tabs = [["roadmap","Профилактика"],["tests","Анализы"],["vaccines","Прививки"],["dental","Стоматолог"]] as const;
  const [openIdx, setOpenIdx] = useState<number|null>(3);
  const [toothData, setToothData, toothDataReady, toothDataError] = usePersistentState<Record<number,{status:ToothStatus;note:string}>>("adultToothData", {});

  if (!toothDataReady) return <div className="p-8 text-sm text-muted-foreground">Загрузка стоматологических записей…</div>;
  if (toothDataError) return <div role="alert" className="p-8 text-sm text-red-600">{toothDataError}</div>;

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily:"'Playfair Display', serif" }}>Навигатор здоровья</h1>
      <p className="text-sm text-muted-foreground mb-5">Профилактика и медицинская история</p>
      <div role="tablist" aria-label="Разделы навигатора здоровья" className="flex gap-1 bg-muted p-1 rounded-lg mb-7">
        {tabs.map(([id,label]) => (
          <button key={id} id={`${tabsId}-tab-${id}`} type="button" role="tab" aria-selected={tab===id} aria-controls={`${tabsId}-panel-${id}`} onClick={() => setTab(id)} className={`flex-1 py-1.5 text-xs rounded-md transition-all font-medium ${tab===id?"bg-card shadow-sm text-foreground":"text-muted-foreground hover:text-foreground"}`}>{label}</button>
        ))}
      </div>

      <div id={`${tabsId}-panel-roadmap`} role="tabpanel" aria-labelledby={`${tabsId}-tab-roadmap`} hidden={tab !== "roadmap"}>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { emoji:"📅", val:"Гинеколог",  sub:"Рекомендован сейчас",  label:"Следующий визит"    },
            { emoji:"✅", val:"Стоматолог",  sub:"Ноябрь 2024",          label:"Последнее посещение"},
            { emoji:"⚠️", val:"4 пункта",   sub:"Этого возраста",       label:"Требует внимания"   },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-3.5">
              <div className="text-2xl mb-2">{c.emoji}</div>
              <div className="text-xs font-semibold text-foreground">{c.val}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{c.label}</div>
              <div className="text-[10px] text-muted-foreground">{c.sub}</div>
            </div>
          ))}
        </div>
        <div className="relative pl-4">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-border"/>
          <div className="space-y-3">
            {HEALTH_ROADMAP.map((cp, idx) => {
              const isOpen=openIdx===idx;
              const doneCount=cp.checks.filter(c=>c.done).length;
              const allDone=doneCount===cp.checks.length;
              return (
                <div key={cp.age} className="relative pl-8">
                  <div className={`absolute left-0 top-3.5 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 z-10 ${cp.current?"bg-primary border-primary text-primary-foreground shadow-md":allDone?"bg-emerald-500 border-emerald-400 text-white":"bg-card border-border text-muted-foreground"}`} style={{ fontFamily:"'DM Mono', monospace" }}>{cp.age}</div>
                  <button onClick={() => setOpenIdx(isOpen?null:idx)} className="w-full text-left bg-card border border-border rounded-xl p-3.5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${cp.current?"text-primary":"text-foreground"}`}>{cp.label}</span>
                        {cp.current && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Сейчас</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground" style={{ fontFamily:"'DM Mono', monospace" }}>{doneCount}/{cp.checks.length}</span>
                        <ChevronRight size={13} className={`text-muted-foreground transition-transform ${isOpen?"rotate-90":""}`}/>
                      </div>
                    </div>
                  </button>
                  {isOpen && (
                    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} className="mt-2 space-y-2">
                      {cp.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-3 bg-muted/50 rounded-lg p-3 border border-border/50">
                          <CheckCircle size={14} className={`mt-0.5 shrink-0 ${check.done?"text-emerald-500":"text-border"}`}/>
                          <div>
                            <p className={`text-xs ${check.done?"line-through text-muted-foreground":"text-foreground font-medium"}`}>{check.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 italic">{check.reason}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div id={`${tabsId}-panel-tests`} role="tabpanel" aria-labelledby={`${tabsId}-tab-tests`} hidden={tab !== "tests"}><LabTestsTab/></div>
      <div id={`${tabsId}-panel-vaccines`} role="tabpanel" aria-labelledby={`${tabsId}-tab-vaccines`} hidden={tab !== "vaccines"}><VaccinesTab statuses={vaccineStatuses} setStatuses={setVaccineStatuses}/></div>
      <div id={`${tabsId}-panel-dental`} role="tabpanel" aria-labelledby={`${tabsId}-tab-dental`} hidden={tab !== "dental"}><DentalTab data={toothData} onChange={setToothData}/></div>
    </div>
  );
}
