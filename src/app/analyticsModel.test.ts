import { describe, expect, it } from "vitest";
import { buildDentalSummary, buildRecentMeasurements, buildVaccineSummary } from "./analyticsModel";
import type { DentalRecord, LabMeasurement, VaccineRecord } from "./models";

const vaccines: VaccineRecord[] = [
  { id: "a", name: "A", protects: "", schedule: "", mandatory: true, status: "due", note: "" },
  { id: "b", name: "B", protects: "", schedule: "", mandatory: false, status: "done", note: "" },
  { id: "c", name: "C", protects: "", schedule: "", mandatory: false, status: "not_applicable", note: "" },
];

describe("analytics derived from persisted profile records", () => {
  it("uses saved vaccine statuses and falls back to catalogue defaults", () => {
    expect(buildVaccineSummary(vaccines, { a: "overdue", b: "done" })).toEqual({
      total: 3, done: 1, due: 0, overdue: 1, notApplicable: 1,
    });
  });

  it("sorts actual measurements newest first and labels unknown test IDs safely", () => {
    const records: Record<string, LabMeasurement[]> = {
      ferritin: [{ id: "old", date: "2025-01-01", value: "30", unit: "нг/мл" }],
      cbc: [{ id: "new", date: "2026-11-01", value: "5.1", unit: "ммоль/л" }],
      unknown: [{ id: "middle", date: "2026-01-01", value: "qualitative", unit: "" }],
    };
    const recent = buildRecentMeasurements(records, new Map([["ferritin", "Ферритин"]]), 2);
    expect(recent.map(item => item.id)).toEqual(["new", "middle"]);
    expect(recent[1].testName).toBe("unknown");
  });

  it("counts recorded teeth separately from non-healthy statuses", () => {
    const records: Record<number, DentalRecord> = {
      11: { status: "healthy", note: "" },
      12: { status: "caries", note: "review" },
      13: { status: "filled", note: "" },
    };
    expect(buildDentalSummary(records)).toEqual({ recorded: 3, attention: 2 });
    expect(buildDentalSummary({})).toEqual({ recorded: 0, attention: 0 });
  });

  it("returns an empty recent history for profiles without measurements", () => {
    expect(buildRecentMeasurements({}, new Map())).toEqual([]);
  });
});
