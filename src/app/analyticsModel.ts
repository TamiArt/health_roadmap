import type { DentalRecord, LabMeasurement, VaccineRecord, VaccineStatus } from "./models";
import type { HealthMonitoringItem, LabResultEntry } from "./healthRecords";
export type AnalyticsCategory = "all" | "laboratory" | "monitoring";
export interface AnalyticsPoint { id: string; date: string; value: number; unit: string; referenceRange?: string; source: "lab-result" | "manual" | "monitoring"; sourceId: string; sourceLabel: string; }
export interface AnalyticsSeries { id: string; name: string; unit: string; category: Exclude<AnalyticsCategory, "all">; points: AnalyticsPoint[]; }
export interface ReferenceBounds { lower?: number; upper?: number; }
function numeric(value: string | number): number | null { const parsed = typeof value === "number" ? value : Number(value.trim().replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; }
export function parseReferenceRange(value?: string): ReferenceBounds | null {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/,/g, ".").replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const pair = raw.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|\.\.)\s*(-?\d+(?:\.\d+)?)$/);
  if (pair) { const lower = Number(pair[1]); const upper = Number(pair[2]); return lower <= upper ? { lower, upper } : { lower: upper, upper: lower }; }
  const upper = raw.match(/^(?:<\s*|≤\s*|до\s+)(-?\d+(?:\.\d+)?)$/i);
  if (upper) return { upper: Number(upper[1]) };
  const lower = raw.match(/^(?:>\s*|≥\s*|от\s+)(-?\d+(?:\.\d+)?)$/i);
  if (lower) return { lower: Number(lower[1]) };
  return null;
}
export function getReferenceStatus(value: number, range?: string): "low" | "normal" | "high" | "unknown" {
  const bounds = parseReferenceRange(range); if (!bounds) return "unknown";
  if (bounds.lower !== undefined && value < bounds.lower) return "low";
  if (bounds.upper !== undefined && value > bounds.upper) return "high";
  return "normal";
}
export function buildAnalyticsSeries(results: LabResultEntry[], measurements: Record<string, LabMeasurement[]>, testNames: ReadonlyMap<string, string>, monitoring: HealthMonitoringItem[]): AnalyticsSeries[] {
  const grouped = new Map<string, AnalyticsSeries>();
  const add = (name: string, unit: string, category: AnalyticsSeries["category"], point: AnalyticsPoint) => {
    const id = [category, name.trim().toLocaleLowerCase("ru"), unit.trim().toLocaleLowerCase("ru")].join(":");
    const current = grouped.get(id) ?? { id, name: name.trim(), unit: unit.trim(), category, points: [] };
    current.points.push(point); grouped.set(id, current);
  };
  for (const result of results) for (const indicator of result.indicators ?? []) add(indicator.name, indicator.unit, "laboratory", {
    id: indicator.id, date: result.date, value: indicator.value, unit: indicator.unit, referenceRange: indicator.referenceRange,
    source: "lab-result", sourceId: result.id, sourceLabel: result.testName,
  });
  for (const [testId, records] of Object.entries(measurements)) for (const record of records) {
    const value = numeric(record.value); if (value === null || !record.unit.trim()) continue;
    const name = testNames.get(testId) ?? testId;
    add(name, record.unit, "laboratory", { id: record.id, date: record.date, value, unit: record.unit, source: "manual", sourceId: record.id, sourceLabel: name });
  }
  for (const item of monitoring) for (const reading of item.measurements ?? []) {
    const value = numeric(reading.value); const unit = reading.unit || item.unit;
    if (value === null || !unit.trim()) continue;
    add(item.name, unit, "monitoring", { id: reading.id, date: reading.date, value, unit, source: "monitoring", sourceId: item.id, sourceLabel: item.name });
  }
  return [...grouped.values()].map(item => ({ ...item, points: [...item.points].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) }))
    .sort((a,b) => a.name.localeCompare(b.name, "ru") || a.unit.localeCompare(b.unit, "ru"));
}
export function filterAnalyticsSeries(series: AnalyticsSeries[], filters: { category: AnalyticsCategory; query: string; fromDate: string; toDate: string }): AnalyticsSeries[] {
  const query = filters.query.trim().toLocaleLowerCase("ru");
  return series.map(item => ({ ...item, points: item.points.filter(point => (!filters.fromDate || point.date >= filters.fromDate) && (!filters.toDate || point.date <= filters.toDate)) }))
    .filter(item => (filters.category === "all" || item.category === filters.category) && item.points.length > 0 &&
      (!query || [item.name, item.unit, ...item.points.map(point => point.sourceLabel)].some(value => value.toLocaleLowerCase("ru").includes(query))));
}
export function getSeriesChange(points: AnalyticsPoint[]): { delta: number; percent: number | null; direction: "up" | "down" | "same" } | null {
  if (points.length < 2) return null;
  const first = points[0].value; const last = points[points.length - 1].value;
  return { delta: last - first, percent: first === 0 ? null : ((last - first) / Math.abs(first)) * 100, direction: last > first ? "up" : last < first ? "down" : "same" };
}

export interface VaccineSummary { total: number; done: number; due: number; overdue: number; notApplicable: number; }
export function buildVaccineSummary(vaccines: VaccineRecord[], statuses: Record<string, VaccineStatus>): VaccineSummary {
  const summary: VaccineSummary = { total: vaccines.length, done: 0, due: 0, overdue: 0, notApplicable: 0 };
  vaccines.forEach(vaccine => {
    const status = statuses[vaccine.id] ?? vaccine.status;
    if (status === "done") summary.done += 1;
    else if (status === "due") summary.due += 1;
    else if (status === "overdue") summary.overdue += 1;
    else if (status === "not_applicable") summary.notApplicable += 1;
  });
  return summary;
}
export function buildDentalSummary(records: Record<number, DentalRecord>): { recorded: number; attention: number } {
  const values = Object.values(records);
  return { recorded: values.length, attention: values.filter(record => record.status !== "healthy").length };
}
