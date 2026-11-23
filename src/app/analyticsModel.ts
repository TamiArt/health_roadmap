import type { DentalRecord, LabMeasurement, VaccineRecord, VaccineStatus } from "./models";

export interface VaccineSummary {
  total: number;
  done: number;
  due: number;
  overdue: number;
  notApplicable: number;
}

export interface RecentMeasurement extends LabMeasurement {
  testId: string;
  testName: string;
}

export function buildVaccineSummary(
  vaccines: VaccineRecord[],
  statuses: Record<string, VaccineStatus>,
): VaccineSummary {
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

export function buildRecentMeasurements(
  measurements: Record<string, LabMeasurement[]>,
  testNames: ReadonlyMap<string, string>,
  limit = 5,
): RecentMeasurement[] {
  return Object.entries(measurements)
    .flatMap(([testId, records]) => records.map(record => ({
      ...record,
      testId,
      testName: testNames.get(testId) ?? testId,
    })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, Math.max(0, limit));
}

export function buildDentalSummary(records: Record<number, DentalRecord>): { recorded: number; attention: number } {
  const values = Object.values(records);
  return {
    recorded: values.length,
    attention: values.filter(record => record.status !== "healthy").length,
  };
}
