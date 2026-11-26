import type { DentalRecord, FamilyEvent, LabMeasurement, UploadedResult } from "./models";
import type { LifeStage } from "./labCatalog";
import type { HealthEvent, HealthMonitoringItem, LabResultEntry, VaccineAdministration } from "./healthRecords";

export type MedicalHistoryKind = "analysis" | "manual" | "event" | "vaccine" | "dental" | "monitoring" | "document" | "family";
export type MedicalHistorySourceSection = "tests" | "events" | "vaccines" | "dental" | "monitoring" | "family";
export interface MedicalHistorySource {
  key: string;
  recordId: string;
  section: MedicalHistorySourceSection;
}
export interface MedicalHistoryEntry {
  id: string;
  source: MedicalHistorySource;
  profileId: string;
  profileLabel: string;
  kind: MedicalHistoryKind;
  date: string | null;
  dateLabel: string;
  datePrecision: "day" | "month" | "season" | "year" | "unknown";
  sortDate: string | null;
  dateEnd: string | null;
  title: string;
  details: string;
  searchable: string;
}
export interface MedicalHistoryFilters {
  query: string;
  kind: MedicalHistoryKind | "all";
  profileId: string | "all";
  fromDate: string;
  toDate: string;
  sort: "newest" | "oldest";
}
export interface MedicalHistoryInput {
  profileId: string;
  profileLabel: string;
  storagePrefix?: string;
  dentalStorageKey?: string;
  vaccineRecordsStorageKey?: string;
  measurements: Record<string, LabMeasurement[]>;
  uploads: Record<string, UploadedResult[]>;
  stages: LifeStage[];
  labResults: LabResultEntry[];
  events: HealthEvent[];
  vaccines: VaccineAdministration[];
  dental: Record<number, DentalRecord>;
  monitoring: HealthMonitoringItem[];
  familyEvents?: FamilyEvent[];
}

const DENTAL_STATUS: Record<DentalRecord["status"], string> = {
  healthy: "Здоров", caries: "Кариес", filled: "Пломба", crown: "Коронка",
  implant: "Имплант", extracted: "Удалён", treatment: "Нужно лечение",
};
const SEASONS: Record<string, { start: string; endMonth: number; endYearOffset: number; label: string }> = {
  "зима": { start: "-12-01", endMonth: 2, endYearOffset: 1, label: "Зима" },
  "весна": { start: "-03-01", endMonth: 5, endYearOffset: 0, label: "Весна" },
  "лето": { start: "-06-01", endMonth: 8, endYearOffset: 0, label: "Лето" },
  "осень": { start: "-09-01", endMonth: 11, endYearOffset: 0, label: "Осень" },
};

export function parseHistoryDate(value: string | null | undefined): Pick<MedicalHistoryEntry, "date" | "dateLabel" | "datePrecision" | "sortDate" | "dateEnd"> {
  const raw = (value ?? "").trim();
  if (!raw) return { date: null, dateLabel: "Дата не указана", datePrecision: "unknown", sortDate: null, dateEnd: null };
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const date = new Date(raw + "T00:00:00");
    if (!Number.isNaN(date.getTime()) && date.getFullYear() === +iso[1] && date.getMonth() + 1 === +iso[2] && date.getDate() === +iso[3]) {
      return { date: raw, dateLabel: new Intl.DateTimeFormat("ru-RU").format(date), datePrecision: "day", sortDate: raw, dateEnd: raw };
    }
    return { date: null, dateLabel: raw, datePrecision: "unknown", sortDate: null, dateEnd: null };
  }
  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (dotted) {
    const canonical = `${dotted[3]}-${dotted[2].padStart(2, "0")}-${dotted[1].padStart(2, "0")}`;
    const parsed = parseHistoryDate(canonical);
    return parsed.date ? parsed : { date: null, dateLabel: raw, datePrecision: "unknown", sortDate: null, dateEnd: null };
  }
  const month = /^(\d{1,2})[./-](\d{4})$/.exec(raw);
  if (month && +month[1] >= 1 && +month[1] <= 12) {
    const sortDate = `${month[2]}-${month[1].padStart(2, "0")}-01`;
    const dateEnd = new Date(Date.UTC(Number(month[2]), Number(month[1]), 0)).toISOString().slice(0, 10);
    return { date: sortDate, dateLabel: `${month[1].padStart(2, "0")}.${month[2]} (месяц)`, datePrecision: "month", sortDate, dateEnd };
  }
  const year = /^(\d{4})$/.exec(raw);
  if (year) return { date: `${year[1]}-01-01`, dateLabel: year[1], datePrecision: "year", sortDate: `${year[1]}-01-01`, dateEnd: `${year[1]}-12-31` };
  const season = /^(зима|весна|лето|осень)\s+(\d{4})$/i.exec(raw);
  if (season) {
    const name = season[1].toLocaleLowerCase("ru");
    const yearNumber = Number(season[2]);
    const period = SEASONS[name];
    const sortDate = `${yearNumber}${period.start}`;
    const dateEnd = new Date(Date.UTC(yearNumber + period.endYearOffset, period.endMonth, 0)).toISOString().slice(0, 10);
    return { date: sortDate, dateLabel: `${period.label.toLocaleLowerCase("ru")} ${yearNumber} (период)`, datePrecision: "season", sortDate, dateEnd };
  }
  return { date: null, dateLabel: raw, datePrecision: "unknown", sortDate: null, dateEnd: null };
}

function stableSort(entries: MedicalHistoryEntry[], direction: "newest" | "oldest"): MedicalHistoryEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.sortDate && !b.sortDate) return a.id.localeCompare(b.id, "ru");
    if (!a.sortDate) return 1;
    if (!b.sortDate) return -1;
    const dateOrder = a.sortDate.localeCompare(b.sortDate);
    if (dateOrder) return direction === "newest" ? -dateOrder : dateOrder;
    return a.id.localeCompare(b.id, "ru");
  });
}

export function buildMedicalHistory(input: MedicalHistoryInput): MedicalHistoryEntry[] {
  const tests = new Map(input.stages.flatMap(stage => stage.tests.map(test => [test.id, test.name] as const)));
  const entries: MedicalHistoryEntry[] = [];
  const prefix = input.storagePrefix ?? "";
  const add = (entry: Omit<MedicalHistoryEntry, "profileId" | "profileLabel">) => {
    entries.push({ ...entry, profileId: input.profileId, profileLabel: input.profileLabel });
  };

  for (const [testId, records] of Object.entries(input.measurements)) for (const record of records) {
    const title = tests.get(testId) ?? testId;
    add({ id: `manual:${testId}:${record.id}`, source: { key: `${prefix}labMeasurements`, recordId: record.id, section: "tests" },
      kind: "manual", ...parseHistoryDate(record.date), title, details: [record.value, record.unit].filter(Boolean).join(" "),
      searchable: [testId, title, record.value, record.unit].filter(Boolean).join(" ") });
  }
  for (const [testId, files] of Object.entries(input.uploads)) for (const file of files) {
    const title = tests.get(testId) ?? testId;
    add({ id: `document:${testId}:${file.id}`, source: { key: `${prefix}labUploads`, recordId: file.id, section: "tests" },
      kind: "document", ...parseHistoryDate(file.date), title, details: file.name, searchable: [testId, title, file.name].join(" ") });
  }
  for (const result of input.labResults) {
    const indicators = result.indicators.map(indicator =>
      `${indicator.name}: ${indicator.value} ${indicator.unit}${indicator.referenceRange ? ` · референс: ${indicator.referenceRange}` : ""}`);
    const documents = [...(result.documents ?? []), ...(result.document ? [result.document] : [])];
    add({ id: `analysis:${result.id}`, source: { key: `${prefix}labResultEntries`, recordId: result.id, section: "tests" },
      kind: "analysis", ...parseHistoryDate(result.date), title: result.testName,
      details: [...indicators, result.notes, documents.length ? `Вложений: ${documents.length}` : ""].filter(Boolean).join(" · "),
      searchable: [result.testName, result.notes, ...indicators, ...documents.map(document => document.name)].filter(Boolean).join(" ") });
  }
  for (const event of input.events) add({
    id: `event:${event.id}`, source: { key: `${prefix}healthEvents`, recordId: event.id, section: "events" },
    kind: "event", ...parseHistoryDate(event.date), title: event.title,
    details: [event.kind, event.facility, event.description].filter(Boolean).join(" · "),
    searchable: [event.title, event.kind, event.facility, event.description].filter(Boolean).join(" "),
  });
  for (const vaccine of input.vaccines) add({
    id: `vaccine:${vaccine.id}`, source: { key: input.vaccineRecordsStorageKey ?? `${prefix}vaccineRecords`, recordId: vaccine.id, section: "vaccines" },
    kind: "vaccine", ...parseHistoryDate(vaccine.date), title: vaccine.vaccineName,
    details: [vaccine.dose, vaccine.facility, vaccine.notes, vaccine.documents?.length ? `Документов: ${vaccine.documents.length}` : ""].filter(Boolean).join(" · "),
    searchable: [vaccine.vaccineName, vaccine.vaccineId, vaccine.dose, vaccine.facility, vaccine.notes, ...(vaccine.documents ?? []).map(document => document.name)].filter(Boolean).join(" "),
  });
  for (const [tooth, record] of Object.entries(input.dental)) add({
    id: `dental:${tooth}`, source: { key: input.dentalStorageKey ?? (prefix ? `${prefix}toothData` : "adultToothData"), recordId: tooth, section: "dental" },
    kind: "dental", ...parseHistoryDate(null), title: `Зуб ${tooth}`,
    details: [DENTAL_STATUS[record.status], record.note].filter(Boolean).join(" · "),
    searchable: [tooth, DENTAL_STATUS[record.status], record.note].filter(Boolean).join(" "),
  });
  for (const item of input.monitoring) for (const reading of item.measurements ?? []) add({
    id: `monitoring:${item.id}:${reading.id}`, source: { key: `${prefix}healthMonitoring`, recordId: `${item.id}-${reading.id}`, section: "monitoring" },
    kind: "monitoring", ...parseHistoryDate(reading.date), title: item.name,
    details: `${reading.value} ${reading.unit || item.unit}`.trim(),
    searchable: [item.name, item.notes, reading.value, reading.unit, item.unit].filter(Boolean).join(" "),
  });
  for (const event of input.familyEvents ?? []) add({
    id: `family:${event.id}`, source: { key: "familyEvents", recordId: event.id, section: "family" },
    kind: "family", ...parseHistoryDate(event.date), title: event.title, details: event.emoji,
    searchable: [event.title, event.date, event.emoji].filter(Boolean).join(" "),
  });

  // One row per persisted record: indicators and attachments stay grouped under their parent study.
  const unique = new Map<string, MedicalHistoryEntry>();
  for (const entry of entries) unique.set(`${entry.source.key}:${entry.source.recordId}`, entry);
  return stableSort([...unique.values()], "newest");
}

export function filterMedicalHistory(entries: MedicalHistoryEntry[], filters: MedicalHistoryFilters): MedicalHistoryEntry[] {
  const query = filters.query.trim().toLocaleLowerCase("ru");
  return stableSort(entries.filter(entry => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) return false;
    if (filters.profileId !== "all" && entry.profileId !== filters.profileId) return false;
    if (filters.fromDate && (!entry.dateEnd || entry.dateEnd < filters.fromDate)) return false;
    if (filters.toDate && (!entry.sortDate || entry.sortDate > filters.toDate)) return false;
    return !query || [entry.title, entry.details, entry.searchable, entry.profileLabel]
      .some(value => value.toLocaleLowerCase("ru").includes(query));
  }), filters.sort);
}
