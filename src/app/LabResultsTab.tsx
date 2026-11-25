import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { usePersistentState } from "./storage";
import { validateLabResult, type LabIndicatorValue, type LabResultEntry } from "./healthRecords";
import { createId, INP, validateLabUpload } from "./shared";
import { LabIndicatorTrend } from "./LabIndicatorTrend";

type IndicatorDraft = { name: string; value: string; unit: string; referenceRange: string };
const emptyIndicator = (): IndicatorDraft => ({ name: "", value: "", unit: "", referenceRange: "" });

export function LabResultsTab({ storageKey = "labResultEntries" }: { storageKey?: string }) {
  const [results, setResults, ready, error, conflict] = usePersistentState<LabResultEntry[]>(storageKey, []);
  const [editing, setEditing] = useState(false);
  const [testName, setTestName] = useState("");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [indicators, setIndicators] = useState<IndicatorDraft[]>([emptyIndicator()]);
  const [notes, setNotes] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const pendingReplaceId = useRef<{ resultId: string; documentId: string } | null>(null);
  const objectUrls = useMemo(() => new Map(results.flatMap(item => [...(item.documents ?? []), ...(item.document ? [item.document] : [])].map(document => [document.id, URL.createObjectURL(document.blob)] as const))), [results]);

  useEffect(() => () => objectUrls.forEach(url => URL.revokeObjectURL(url)), [objectUrls]);

  function resetForm() {
    setTestName("");
    setDate(new Date().toISOString().slice(0, 10));
    setIndicators([emptyIndicator()]);
    setNotes("");
    setDocuments([]);
    setEditingId(null);
    setFormError(null);
  }

  function startEdit(result: LabResultEntry) {
    setEditingId(result.id);
    setTestName(result.testName);
    setDate(result.date);
    setIndicators(result.indicators.map(item => ({
      name: item.name, value: String(item.value), unit: item.unit, referenceRange: item.referenceRange ?? "",
    })));
    setNotes(result.notes);
    setDocuments([]);
    setFormError(null);
    setEditing(true);
  }

  function save() {
    const fileError = documents.map(validateLabUpload).find(Boolean);
    if (fileError) { setFormError(fileError); return; }
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
    };
    const validation = validateLabResult(draft);
    if (validation) { setFormError(validation); return; }
    const additions = documents.map(file => ({
      id: createId(), name: file.name, mimeType: file.type || "application/octet-stream", blob: file,
    }));
    setResults(previous => {
      const existing = previous.find(item => item.id === editingId);
      const retained = existing ? [...(existing.documents ?? []), ...(existing.document ? [existing.document] : [])] : [];
      const nextRecord: LabResultEntry = {
        ...draft, id: editingId ?? createId(),
        ...(retained.length + additions.length ? { documents: [...retained, ...additions] } : {}),
      };
      const next = existing ? previous.map(item => item.id === existing.id ? nextRecord : item) : [...previous, nextRecord];
      return [...next].sort((a, b) => b.date.localeCompare(a.date) || a.testName.localeCompare(b.testName, "ru"));
    });
    resetForm();
    setEditing(false);
  }

  function replaceDocument(result: LabResultEntry, document: { id: string; name: string }) {
    pendingReplaceId.current = { resultId: result.id, documentId: document.id };
    replaceFileRef.current?.click();
  }

  function handleReplacement(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const target = pendingReplaceId.current;
    pendingReplaceId.current = null;
    event.target.value = "";
    if (!file || !target) return;
    const fileError = validateLabUpload(file);
    if (fileError) { setFormError(fileError); return; }
    const current = results.find(item => item.id === target.resultId);
    const documents = current ? [...(current.documents ?? []), ...(current.document ? [current.document] : [])] : [];
    const oldDocument = documents.find(item => item.id === target.documentId);
    if (!current || !oldDocument || !window.confirm(`Заменить документ «${oldDocument.name}» файлом «${file.name}»? Старый файл будет удалён.`)) return;
    const nextDocument = { id: createId(), name: file.name, mimeType: file.type || "application/octet-stream", blob: file };
    setResults(previous => previous.map(item => item.id !== current.id ? item : {
      ...item,
      document: undefined,
      documents: [...(item.documents ?? []), ...(item.document ? [item.document] : [])]
        .map(document => document.id === oldDocument.id ? nextDocument : document),
    }));
  }

  function removeDocument(result: LabResultEntry, document: { id: string; name: string }) {
    if (!window.confirm(`Удалить документ «${document.name}»? Это действие нельзя отменить.`)) return;
    setResults(previous => previous.map(item => item.id !== result.id ? item : {
      ...item,
      document: undefined,
      documents: [...(item.documents ?? []), ...(item.document ? [item.document] : [])]
        .filter(file => file.id !== document.id),
    }));
  }

  const visibleResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return [...results].filter(result => !normalized || [
      result.testName, result.notes,
      ...result.indicators.flatMap(item => [item.name, String(item.value), item.unit, item.referenceRange ?? ""]),
      ...(result.documents ?? []).map(item => item.name),
      ...(result.document ? [result.document.name] : []),
    ].some(value => value.toLocaleLowerCase("ru").includes(normalized)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.testName.localeCompare(b.testName, "ru"));
  }, [results, query, fromDate, toDate]);

  if (!ready) return <p className="text-sm text-muted-foreground">Загрузка истории анализов…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return <section aria-label="Подробные результаты анализов" className="space-y-4">
    {conflict && <p role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">История изменена в другой вкладке. Загружена последняя сохранённая версия.</p>}
    <input ref={replaceFileRef} type="file" aria-label="Выбрать документ для замены" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleReplacement}/>
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">История результатов</h2><p className="text-xs text-muted-foreground">Сохраняйте все числовые показатели каждого анализа по датам</p></div><button type="button" onClick={() => setEditing(value => !value)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить анализ</button></div>
    {editing && <div className="space-y-3 rounded-xl border border-primary/20 bg-card p-4">
      <div className="grid grid-cols-2 gap-2"><input aria-label="Название анализа" value={testName} maxLength={120} onChange={event => setTestName(event.target.value)} placeholder="Название анализа" className={INP}/><input aria-label="Дата анализа" type="date" value={date} onChange={event => setDate(event.target.value)} className={INP}/></div>
      <div className="flex items-center justify-between"><p className="text-xs font-semibold">Показатели анализа</p><button type="button" onClick={() => setIndicators(previous => [...previous, emptyIndicator()])} className="inline-flex items-center gap-1 text-xs text-primary"><Plus size={12}/> Показатель</button></div>
      {indicators.map((item, index) => <div key={index} className="rounded-lg border border-border/70 p-2 space-y-2">
        <div className="grid grid-cols-2 gap-2"><input aria-label={`Название показателя ${index + 1}`} value={item.name} maxLength={100} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, name: event.target.value } : value))} placeholder="Показатель (например, глюкоза)" className={INP}/><input aria-label={`Значение показателя ${index + 1}`} type="number" step="any" value={item.value} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, value: event.target.value } : value))} placeholder="Числовое значение" className={INP}/></div>
        <div className="grid grid-cols-2 gap-2"><input aria-label={`Единица измерения ${index + 1}`} value={item.unit} maxLength={24} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, unit: event.target.value } : value))} placeholder="Единица измерения" className={INP}/><div className="flex gap-1"><input aria-label={`Референсный диапазон ${index + 1}`} value={item.referenceRange} maxLength={60} onChange={event => setIndicators(previous => previous.map((value, i) => i === index ? { ...value, referenceRange: event.target.value } : value))} placeholder="Референс (необязательно)" className={INP}/>{indicators.length > 1 && <button type="button" aria-label={`Удалить показатель ${index + 1}`} onClick={() => setIndicators(previous => previous.filter((_, i) => i !== index))} className="px-1 text-muted-foreground hover:text-red-600"><X size={13}/></button>}</div></div>
      </div>)}
      <textarea aria-label="Комментарий к анализу" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Комментарий (необязательно)" rows={2} className={INP}/>
      <div className="flex flex-wrap items-center gap-2"><input ref={fileRef} type="file" aria-label="Выбрать документ анализа" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" multiple onChange={event => { const selected = Array.from(event.target.files ?? []); setDocuments(previous => [...previous, ...selected]); event.target.value = ""; }}/><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Upload size={12}/> Прикрепить документ</button>{documents.map((file, index) => <span key={`${file.name}-${index}`} className="flex items-center gap-1 text-xs text-muted-foreground"><FileText size={12}/>{file.name}<button type="button" aria-label={`Убрать выбранный документ ${file.name}`} onClick={() => setDocuments(previous => previous.filter((_, i) => i !== index))}><X size={12}/></button></span>)}</div>
      <p className="text-[10px] text-muted-foreground">К одной записи анализа можно прикрепить несколько документов. При редактировании существующие вложения сохраняются; новые добавляются к ним.</p>
      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { resetForm(); setEditing(false); }} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">{editingId ? "Сохранить изменения" : "Сохранить анализ"}</button></div>
    </div>}
    <div className="space-y-2"><label className="block text-xs text-muted-foreground">Поиск по анализам, показателям и документам<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Название, показатель, значение, единица, референс, файл" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/></label><div className="grid grid-cols-2 gap-2"><label className="text-xs text-muted-foreground">Период с<input aria-label="Период поиска анализов с" type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground"/></label><label className="text-xs text-muted-foreground">Период по<input aria-label="Период поиска анализов по" type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground"/></label></div></div>
    {visibleResults.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{results.length ? "По запросу анализов нет." : "История пока пуста. Добавьте анализ и внесите все его показатели."}</div> : <div className="space-y-3">{visibleResults.map(result => <article key={result.id} id={`medical-source-tests-${result.id}`} className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{result.testName}</h3><p className="mt-1 text-xs text-muted-foreground">{result.date}</p></div><div className="flex gap-1"><button type="button" aria-label={`Изменить анализ ${result.testName} от ${result.date}`} onClick={() => startEdit(result)} className="p-1 text-muted-foreground hover:text-primary"><Pencil size={14}/></button><button type="button" aria-label={`Удалить анализ ${result.testName} от ${result.date}`} onClick={() => { if (window.confirm("Удалить всю запись анализа вместе с показателями и документом?")) setResults(previous => previous.filter(item => item.id !== result.id)); }} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div></div>
      <div className="mt-3 divide-y divide-border/70">{result.indicators.map(indicator => <div key={indicator.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2"><span className="text-xs text-muted-foreground">{indicator.name}{indicator.referenceRange ? ` · референс: ${indicator.referenceRange}` : ""}</span><strong className="text-sm tabular-nums">{indicator.value} <span className="text-xs font-normal text-muted-foreground">{indicator.unit}</span></strong></div>)}</div>
      {result.indicators.map(indicator => {
        const points = results.flatMap(entry => entry.indicators
          .filter(item => entry.testId === result.testId && item.name.trim().toLocaleLowerCase("ru") === indicator.name.trim().toLocaleLowerCase("ru") && item.unit === indicator.unit)
          .map(item => ({ date: entry.date, value: item.value })));
        return <LabIndicatorTrend key={indicator.id} name={indicator.name} unit={indicator.unit} points={points} />;
      })}
      {result.notes && <p className="mt-2 text-xs text-muted-foreground">{result.notes}</p>}
      {[...(result.documents ?? []), ...(result.document ? [result.document] : [])].map(document => <div key={document.id} className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 p-2"><FileText size={14}/><a href={objectUrls.get(document.id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-primary hover:underline">{document.name}</a><button type="button" aria-label={`Заменить документ ${document.name}`} onClick={() => replaceDocument(result, document)} className="rounded border px-2 py-1 text-[10px]">Заменить</button><button type="button" aria-label={`Удалить документ ${document.name}`} onClick={() => removeDocument(result, document)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={13}/></button></div>)}
    </article>)}</div>}
  </section>;
}
