import type { DentalRecord, LabMeasurement, UploadedResult } from "./models";
import type { LifeStage } from "./labCatalog";
import type {
  HealthEvent,
  HealthMonitoringItem,
  LabResultEntry,
  VaccineAdministration,
} from "./healthRecords";

export type MedicalHistoryKind = "analysis" | "manual" | "event" | "vaccine" | "dental" | "monitoring" | "document";
export interface MedicalHistoryEntry {
  id: string;
  kind: MedicalHistoryKind;
  date: string | null;
  title: string;
  details: string;
  searchable: string;
}

export interface MedicalHistoryFilters {
  query: string;
  kind: MedicalHistoryKind | "all";
  fromDate: string;
  toDate: string;
  sort: "newest" | "oldest";
}

const DENTAL_STATUS: Record<DentalRecord["status"], string> = {
  healthy: "Здоров",
  caries: "Кариес",
  filled: "Пломба",
  crown: "Коронка",
  implant: "Имплант",
  extracted: "Удалён",
  treatment: "Нужно лечение",
};

export function buildMedicalHistory(input: {
  measurements: Record<string, LabMeasurement[]>;
  uploads: Record<string, UploadedResult[]>;
  stages: LifeStage[];
  labResults: LabResultEntry[];
  events: HealthEvent[];
  vaccines: VaccineAdministration[];
  dental: Record<number, DentalRecord>;
  monitoring: HealthMonitoringItem[];
}): MedicalHistoryEntry[] {
  const tests = new Map(input.stages.flatMap(stage => stage.tests.map(test =>
    [test.id, test.name] as const,
  )));
  const entries: MedicalHistoryEntry[] = [];

  for (const [testId, records] of Object.entries(input.measurements)) {
    for (const record of records) entries.push({
      id: `manual:${testId}:${record.id}`, kind: "manual", date: record.date,
      title: tests.get(testId) ?? testId,
      details: [record.value, record.unit].filter(Boolean).join(" "),
      searchable: [testId, tests.get(testId), record.value, record.unit].filter(Boolean).join(" "),
    });
  }

  for (const [testId, files] of Object.entries(input.uploads)) {
    for (const file of files) {
      const [day, month, year] = file.date.split(".");
      const parsedDate = day && month && year ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}` : null;
      entries.push({
        id: `document:${testId}:${file.id}`, kind: "document", date: parsedDate,
        title: tests.get(testId) ?? testId, details: file.name, searchable: [testId, tests.get(testId), file.name].filter(Boolean).join(" "),
      });
    }
  }

  for (const result of input.labResults) {
    for (const indicator of result.indicators) entries.push({
      id: `analysis:${result.id}:${indicator.id}`, kind: "analysis", date: result.date,
      title: result.testName,
      details: `${indicator.name}: ${indicator.value} ${indicator.unit}${indicator.referenceRange ? ` · референс: ${indicator.referenceRange}` : ""}${result.documents?.length || result.document ? " · есть вложения" : ""}`,
      searchable: [result.testName, result.notes, indicator.name, indicator.value, indicator.unit, indicator.referenceRange, ...(result.documents ?? []).map(document => document.name), ...(result.document ? [result.document.name] : [])].filter(Boolean).join(" "),
    });
  }

  for (const event of input.events) entries.push({
    id: `event:${event.id}`, kind: "event", date: event.date, title: event.title,
    details: [event.kind, event.facility, event.description].filter(Boolean).join(" · "),
    searchable: [event.title, event.kind, event.facility, event.description].filter(Boolean).join(" "),
  });

  for (const vaccine of input.vaccines) entries.push({
    id: `vaccine:${vaccine.id}`, kind: "vaccine", date: vaccine.date, title: vaccine.vaccineName,
    details: [vaccine.dose, vaccine.facility, vaccine.notes, vaccine.documents?.length ? `Документов: ${vaccine.documents.length}` : ""].filter(Boolean).join(" · "),
    searchable: [vaccine.vaccineName, vaccine.vaccineId, vaccine.dose, vaccine.facility, vaccine.notes, ...(vaccine.documents ?? []).map(document => document.name)].filter(Boolean).join(" "),
  });

  for (const [tooth, record] of Object.entries(input.dental)) entries.push({
    id: `dental:${tooth}`, kind: "dental", date: null, title: `Зуб ${tooth}`,
    details: [DENTAL_STATUS[record.status], record.note].filter(Boolean).join(" · "),
    searchable: [tooth, DENTAL_STATUS[record.status], record.note].filter(Boolean).join(" "),
  });

  for (const item of input.monitoring) {
    for (const reading of item.measurements ?? []) entries.push({
      id: `monitoring:${item.id}:${reading.id}`, kind: "monitoring", date: reading.date,
      title: item.name, details: `${reading.value} ${reading.unit || item.unit}`.trim(),
      searchable: [item.name, item.notes, reading.value, reading.unit, item.unit].filter(Boolean).join(" "),
    });
  }

  return entries.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title, "ru");
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ru");
  });
}

export function filterMedicalHistory(entries: MedicalHistoryEntry[], filters: MedicalHistoryFilters): MedicalHistoryEntry[] {
  const query = filters.query.trim().toLocaleLowerCase("ru");
  return entries.filter(entry => {
    if (filters.kind !== "all" && entry.kind !== filters.kind) return false;
    if (filters.fromDate && (!entry.date || entry.date < filters.fromDate)) return false;
    if (filters.toDate && (!entry.date || entry.date > filters.toDate)) return false;
    return !query || [entry.title, entry.details, entry.searchable]
      .some(value => value.toLocaleLowerCase("ru").includes(query));
  }).sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title, "ru");
    if (!a.date) return 1;
    if (!b.date) return -1;
    const order = a.date.localeCompare(b.date);
    return filters.sort === "newest" ? -order : order;
  });
}
