import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import type { VaccineRecord } from "./models";
import type { MedicalDocument, VaccineAdministration } from "./healthRecords";
import { validateVaccineAdministration } from "./healthRecords";
import { createId, INP, validateLabUpload } from "./shared";
import { usePersistentState } from "./storage";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function VaccineHistoryPanel({
  vaccines,
  storageKey = "vaccineRecords",
}: {
  vaccines: VaccineRecord[];
  storageKey?: string;
}) {
  const [records, setRecords, ready, error, conflict] = usePersistentState<VaccineAdministration[]>(storageKey, []);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vaccineId, setVaccineId] = useState("");
  const [date, setDate] = useState(today());
  const [dose, setDose] = useState("");
  const [facility, setFacility] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrls = useMemo(() => {
    const urls = new Map<string, string>();
    records.forEach(record => record.documents?.forEach(document => urls.set(document.id, URL.createObjectURL(document.blob))));
    return urls;
  }, [records]);
  useEffect(() => () => objectUrls.forEach(url => URL.revokeObjectURL(url)), [objectUrls]);

  function reset() {
    setEditing(false);
    setEditingId(null);
    setVaccineId("");
    setDate(today());
    setDose("");
    setFacility("");
    setNotes("");
    setFiles([]);
    setFormError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(record: VaccineAdministration) {
    setEditingId(record.id);
    setVaccineId(record.vaccineId);
    setDate(record.date);
    setDose(record.dose);
    setFacility(record.facility);
    setNotes(record.notes);
    setFiles([]);
    setFormError(null);
    setEditing(true);
  }

  function save() {
    const vaccine = vaccines.find(item => item.id === vaccineId);
    const draft = {
      vaccineId,
      vaccineName: vaccine?.name ?? records.find(item => item.id === editingId)?.vaccineName ?? "",
      date,
      dose: dose.trim(),
      facility: facility.trim(),
      notes: notes.trim(),
    };
    const validation = validateVaccineAdministration(draft);
    if (validation) { setFormError(validation); return; }
    const invalidFile = files.map(validateLabUpload).find(Boolean);
    if (invalidFile) { setFormError(invalidFile); return; }
    const documents: MedicalDocument[] = files.map(file => ({
      id: createId(), name: file.name, mimeType: file.type || "application/octet-stream", blob: file,
    }));
    setRecords(previous => {
      const next = editingId
        ? previous.map(record => record.id === editingId
          ? { ...record, ...draft, documents: [...(record.documents ?? []), ...documents] }
          : record)
        : [...previous, { id: createId(), ...draft, documents }];
      return [...next].sort((a, b) => b.date.localeCompare(a.date) || a.vaccineName.localeCompare(b.vaccineName, "ru"));
    });
    reset();
  }

  function removeDocument(record: VaccineAdministration, document: MedicalDocument) {
    if (!window.confirm(`Удалить документ «${document.name}»? Это действие нельзя отменить.`)) return;
    setRecords(previous => previous.map(item => item.id === record.id
      ? { ...item, documents: (item.documents ?? []).filter(file => file.id !== document.id) }
      : item));
  }

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ru");
    return [...records].filter(record => !normalized || [
      record.vaccineName, record.dose, record.facility, record.notes,
      ...(record.documents ?? []).map(document => document.name),
    ].some(value => value.toLocaleLowerCase("ru").includes(normalized)))
      .sort((a, b) => b.date.localeCompare(a.date) || a.vaccineName.localeCompare(b.vaccineName, "ru"));
  }, [records, query]);

  if (!ready) return <p role="status" aria-busy="true" className="text-sm text-muted-foreground">Загрузка истории вакцинации…</p>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;

  return <section className="mt-6 space-y-3" aria-label="История вакцинации">
    <div className="flex items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold">История вакцинации</h3><p className="text-xs text-muted-foreground">Фактические даты, дозы и документы о прививках</p></div>
      <button type="button" onClick={() => { reset(); setEditing(true); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground"><Plus size={13}/> Добавить запись</button>
    </div>
    {conflict && <p role="status" className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">История изменена в другой вкладке. Загружена последняя сохранённая версия.</p>}
    {editing && <div className="space-y-2 rounded-xl border border-primary/20 bg-card p-4">
      <label className="block text-xs text-muted-foreground">Вакцина
        <select aria-label="Вакцина для записи" value={vaccineId} onChange={event => setVaccineId(event.target.value)} className={INP}>
          <option value="">Выберите вакцину</option>{vaccines.map(vaccine => <option key={vaccine.id} value={vaccine.id}>{vaccine.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Дата введения<input aria-label="Дата вакцинации" type="date" max={today()} value={date} onChange={event => setDate(event.target.value)} className={INP}/></label>
        <label className="text-xs text-muted-foreground">Доза / этап<input aria-label="Доза вакцины" value={dose} maxLength={60} onChange={event => setDose(event.target.value)} placeholder="Например, 1-я доза" className={INP}/></label>
      </div>
      <input aria-label="Медицинское учреждение вакцинации" value={facility} maxLength={160} onChange={event => setFacility(event.target.value)} placeholder="Клиника или учреждение (необязательно)" className={INP}/>
      <textarea aria-label="Примечания к вакцинации" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} placeholder="Серия вакцины, реакция, примечания" rows={2} className={INP}/>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" multiple aria-label="Документы о вакцинации" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={event => setFiles(previous => [...previous, ...Array.from(event.target.files ?? [])])}/>
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><Upload size={12}/> Прикрепить документы</button>
        {files.map((file, index) => <span key={`${file.name}-${index}`} className="flex items-center gap-1 text-xs text-muted-foreground">{file.name}<button type="button" aria-label={`Убрать файл ${file.name}`} onClick={() => setFiles(previous => previous.filter((_, i) => i !== index))}><X size={12}/></button></span>)}
      </div>
      {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={reset} className="rounded-lg border px-3 py-1.5 text-xs">Отмена</button><button type="button" onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">{editingId ? "Сохранить изменения" : "Сохранить запись"}</button></div>
    </div>}
    <label className="block text-xs text-muted-foreground">Поиск по вакцинациям
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Вакцина, доза, клиника, документ" className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"/>
    </label>
    {visible.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">{records.length ? "По запросу записей нет." : "Фактические прививки ещё не записаны."}</div> :
      <div className="space-y-2">{visible.map(record => <article key={record.id} className="rounded-xl border bg-card p-3">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="text-sm font-medium">{record.vaccineName}</h4><p className="mt-1 text-xs text-muted-foreground">{record.date} · {record.dose}{record.facility ? ` · ${record.facility}` : ""}</p>{record.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{record.notes}</p>}</div>
          <div className="flex gap-1"><button type="button" aria-label={`Изменить вакцинацию ${record.vaccineName} от ${record.date}`} onClick={() => startEdit(record)} className="p-1 text-muted-foreground hover:text-primary"><Pencil size={14}/></button><button type="button" aria-label={`Удалить вакцинацию ${record.vaccineName} от ${record.date}`} onClick={() => { if (window.confirm("Удалить запись о вакцинации и все её документы?")) setRecords(previous => previous.filter(item => item.id !== record.id)); }} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={14}/></button></div>
        </div>
        {!!record.documents?.length && <div className="mt-3 space-y-1">{record.documents.map(document => <div key={document.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2"><FileText size={13}/><a href={objectUrls.get(document.id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-primary hover:underline">{document.name}</a><button type="button" aria-label={`Удалить документ ${document.name}`} onClick={() => removeDocument(record, document)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 size={13}/></button></div>)}</div>}
      </article>)}</div>}
  </section>;
}
