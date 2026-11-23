import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { usePersistentState } from "./storage";
import { validateLabResult, type LabIndicatorValue, type LabResultEntry } from "./healthRecords";
import { createId, INP } from "./shared";

type IndicatorDraft = { name: string; value: string; unit: string; referenceRange: string };
const emptyIndicator = (): IndicatorDraft => ({ name: "", value: "", unit: "", referenceRange: "" });

export function LabResultsTab() {
  const [results, setResults, ready, error] = usePersistentState<LabResultEntry[]>("labResultEntries", []);
  const [editing, setEditing] = useState(false);
  const [testName, setTestName] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [indicators, setIndicators] = useState<IndicatorDraft[]>([emptyIndicator()]);
  const [notes, setNotes] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const pendingReplaceId = useRef<string | null>(null);
  const objectUrls = useMemo(() => new Map(results.filter(item => item.document).map(item => [item.id, URL.createObjectURL(item.document!.blob)])), [results]);

  useEffect(() => () => objectUrls.forEach(url => URL.revokeObjectURL(url)), [objectUrls]);

  function resetForm() {
    setTestName("");
    setDate(new Date().toISOString().slice(0, 10));
    setIndicators([emptyIndicator()]);
    setNotes("");
    setDocument(null);
    setFormError(null);
  }

  function save() {
    const values: LabIndicatorValue[] = indicators.map(item => ({
      id: createId(),
      name: item.name.trim(),
      value: Number(item.value),
      unit: item.unit.trim(),
      ...(item.referenceRange.trim() ? { referenceRange: item.referenceRange.trim() } : {}),
    }));
    const draft: Omit<LabResultEntry, "id"> = {
      testId: `custom:${testName.trim().toLowerCase()}`,
      testName: testName.trim(),
      date,
      indicators: values,
      notes: notes.trim(),
      ...(document ? { document: { id: createId(), name: document.name, mimeType: document.type || "application/octet-stream", blob: document } } : {}),
    };
    const validation = validateLabResult(draft);
    if (validation) { setFormError(validation); return; }
    setResults(previous => [...previous, { ...draft, id: createId() }].sort((a, b) => b.date.localeCompare(a.date)));
    resetForm();
    setEditing(false);
  }

  function replaceDocument(result: LabResultEntry) {
    pendingReplaceId.current = result.id;
    replaceFileRef.current?.click();
  }

  function handleReplacement(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const resultId = pendingReplaceId.current;
    pendingReplaceId.current = null;
    event.target.value = "";
    if (!file || !resultId) return;
    const current = results.find(item => item.id === resultId);
    if (!current?.document || !window.confirm(`Удалить документ «${current.document.name}» и заменить его новым?`)) return;
    setResults(previous => previous.map(item => item.id === resultId ? { ...item, document: { id: createId(), name: file.name, mimeType: file.type || "application/octet-stream", blob: file } } : item));
  }

  function removeDocument(result: LabResultEntry) {
    if (!result.document) return;
    if (!window.confirm(`Удалить документ «${result.document.name}»? Это действие нельзя отменить.`)) return;
    setResults(previous => previous.map(item => item.id === result.id ? { ...item, document: undefined } : item));
  }

  if (!ready) return <p className="text-sm text-muted-foreground">Загрузка истории анализов…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">История результатов</h2><p className="text-xs text-muted-foreground">Сохраняйте все числовые показатели каждого анализа по датам</p></div><button type="button" onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить анализ</button></div>
    {editing && <div className="space-y-3 rounded-xl border border-primary/20 bg-card p-4">
      <div className="grid grid-cols-2 gap-2"><input aria-label="Название анализа" value={testName} maxLength={120} onChange={event => setTestName(event.target.value)} placeholder="Название анализа" className={INP}/><input aria-label="Дата анализа" type="date" value={date} onChange={event => setDate(event.target.value)} className={INP}/></div>
      <div className="flex items-center justify-between"><p className="text-xs font-semibold">Показатели анализа</p><button type="button" onClick={() => setIndicators(previous => [...previous, emptyIndicator()])} className="inline-flex items-center gap-1 text-xs text-primary"><Plus size={12}/> Показатель</button></div>
      {indicators.map((item, index) => <div key={index} className="rounded-lg border border-border/70 p-2 space-y-2">
        <div className="grid grid-cols-2 gap-2"><input aria-label={`Название показателя ${index + 1}`} value={item.name} maxLength={100} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} placeholder="Показатель (например, глюкоза)" className={INP}/><input aria-label={`Значение показателя ${index + 1}`} type="number" step="any" value={item.value} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, value: event.target.value } : value))} placeholder="Числовое значение" className={INP}/></div>
        <div className="grid grid-cols-2 gap-2"><input aria-label={`Единица измерения ${index + 1}`} value={item.unit} maxLength={24} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, unit: event.target.value } : value))} placeholder="Единица измерения" className={INP}/><div className="flex gap-1"><input aria-label={`Референсный диапазон ${index + 1}`} value={item.referenceRange} maxLength={60} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, referenceRange: event.target.value } : value))} placeholder="Референс (необязательно)" className={INP}/>{indicators.length > 1 && <button type="button" aria-label={`Удалить показатель ${index + 1}`} onClick={() => setIndicators(previous => previous.filter((_, i) => i !== index))} className="px-1 text-muted-foreground hover:text-red-600"><X size={13}/></button>}</div></div>
      </div>)}
      <textarea aria-label="Комментарий к анализу" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Комментарий (необязательно)" rows={2} className={INP}/>
      <div className="flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={event => setDocument(event.target.files?.[0] ?? null)}/><input ref={replaceFileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleReplacement}/><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Upload size={12}/> Прикрепить документ</button>{document && <span className="flex items-center gap-1 text-xs text-muted-foreground"><FileText size={12}/>{document.name}<button type="button" aria-label="Убрать выбранный документ" onClick={() => setDocument(null)}><X size={12}/></button></span>}</div>
      <p className="text-[10px] text-muted-foreground">К одной записи анализа можно прикрепить только один документ. Чтобы заменить документ в сохранённой записи, сначала удалите его с подтверждением.</p>
      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { resetForm(); setEditing(false); }} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Сохранить анализ</button></div>
    </div>}
    {results.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">История пока пуста. Добавьте анализ и внесите все его показатели.</div> : <div className="space-y-3">{results.map(result => <article key={result.id} className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{result.testName}</h3><p className="mt-1 text-xs text-muted-foreground">{result.date}</p></div><button type="button" aria-label={`Удалить анализ ${result.testName} от ${result.date}`} onClick={() => { if (window.confirm("Удалить всю запись анализа вместе с показателями и документом?")) setResults(previous => previous.filter(item => item.id !== result.id)); }} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div>
      <div className="mt-3 divide-y divide-border/70">{result.indicators.map(indicator => <div key={indicator.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2"><span className="text-xs text-muted-foreground">{indicator.name}{indicator.referenceRange ? ` · референс: ${indicator.referenceRange}` : ""}</span><strong className="text-sm tabular-nums">{indicator.value} <span className="text-xs font-normal text-muted-foreground">{indicator.unit}</span></strong></div>)}</div>
      {result.notes && <p className="mt-2 text-xs text-muted-foreground">{result.notes}</p>}
      {result.document && <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 p-2"><FileText size={14}/><a href={objectUrls.get(result.id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-primary hover:underline">{result.document.name}</a><button type="button" aria-label="Заменить прикреплённый документ" onClick={() => replaceDocument(result)} className="rounded border px-2 py-1 text-[10px]">Заменить</button><button type="button" aria-label="Удалить прикреплённый документ" onClick={() => removeDocument(result)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={13}/></button></div>}
    </article>)}</div>}
  </section>;
}
