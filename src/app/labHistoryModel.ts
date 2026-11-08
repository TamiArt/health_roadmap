import type { LabMeasurement } from "./models";
import type { LifeStage } from "./labCatalog";

export interface LabHistoryEntry extends LabMeasurement {
  testId: string;
  testName: string;
  stageLabel: string;
}
export interface LabHistoryFilters { query: string; fromDate: string; toDate: string; }

export function buildLabHistory(measurements: Record<string, LabMeasurement[]>, stages: LifeStage[]): LabHistoryEntry[] {
  const tests = new Map(stages.flatMap(stage => stage.tests.map(test => [
    test.id, { name: test.name, stageLabel: stage.label },
  ] as const)));
  return Object.entries(measurements).flatMap(([testId, records]) => records.map(record => {
    const metadata = tests.get(testId);
    return { ...record, testId, testName: metadata?.name ?? testId, stageLabel: metadata?.stageLabel ?? "Другие исследования" };
  })).sort((a,b) => b.date.localeCompare(a.date) || a.testName.localeCompare(b.testName));
}
export function filterLabHistory(entries: LabHistoryEntry[], filters: LabHistoryFilters): LabHistoryEntry[] {
  const query = filters.query.trim().toLocaleLowerCase("ru");
  return entries.filter(entry => {
    if (filters.fromDate && entry.date < filters.fromDate) return false;
    if (filters.toDate && entry.date > filters.toDate) return false;
    return !query || [entry.testName, entry.stageLabel, entry.value, entry.unit]
      .some(value => value.toLocaleLowerCase("ru").includes(query));
  });
}
