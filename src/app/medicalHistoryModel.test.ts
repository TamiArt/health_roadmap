import { describe, expect, it } from "vitest";
import { buildMedicalHistory, filterMedicalHistory } from "./medicalHistoryModel";

const stages = [{ id: "blood", label: "Анализы крови", age: "все", tests: [{ id: "cbc", name: "Общий анализ крови" }] }] as any;

describe("unified medical history", () => {
  const entries = buildMedicalHistory({
    stages,
    measurements: { cbc: [{ id: "m1", date: "2026-02-01", value: "5.4", unit: "ммоль/л" }] },
    uploads: { cbc: [{ id: "file-1", name: "analysis.pdf", date: "20.02.2026", blob: new Blob(["file"]), isPdf: true }] },
    labResults: [{
      id: "lab1", testId: "custom:cbc", testName: "ОАК", date: "2026-03-01",
      indicators: [{ id: "hb", name: "Гемоглобин", value: 132, unit: "г/л" }],
      notes: "контроль", documents: [],
    }],
    events: [{ id: "event1", date: "2026-01-01", kind: "operation", title: "Операция", description: "Описание", facility: "Клиника" }],
    vaccines: [{ id: "v1", vaccineId: "mmr", vaccineName: "MMR", date: "2026-04-01", dose: "1", facility: "", notes: "" }],
    dental: { 16: { status: "filled", note: "Пломба 2025" } },
    monitoring: [{
      id: "mon1", name: "Глюкоза", kind: "measurement", unit: "ммоль/л", intervalDays: 30,
      nextDueDate: "2026-05-01", lastCheckedDate: "", notes: "",
      reminder: { enabled: false, leadDays: 0, time: "09:00" },
      measurements: [{ id: "r1", date: "2026-05-02", value: 5.1, unit: "ммоль/л" }],
    }],
  });

  it("combines every medical source and places undated dental records last", () => {
    expect(entries.map(entry => entry.kind)).toEqual(["monitoring", "vaccine", "analysis", "document", "manual", "event", "dental"]);
    expect(entries[entries.length - 1]).toMatchObject({ kind: "dental", title: "Зуб 16" });
  });

  it("filters by category, date range and searchable details", () => {
    expect(filterMedicalHistory(entries, { query: "гемоглобин", kind: "analysis", fromDate: "", toDate: "", sort: "newest" })).toHaveLength(1);
    expect(filterMedicalHistory(entries, { query: "", kind: "event", fromDate: "2026-02-01", toDate: "", sort: "newest" })).toHaveLength(0);
    expect(filterMedicalHistory(entries, { query: "пломба", kind: "all", fromDate: "", toDate: "", sort: "newest" })).toHaveLength(1);
  });

  it("supports oldest-first sorting without mutating source entries", () => {
    const oldest = filterMedicalHistory(entries, { query: "", kind: "all", fromDate: "", toDate: "", sort: "oldest" });
    expect(oldest[0].date).toBe("2026-01-01");
    expect(entries[0].date).toBe("2026-05-02");
  });
});
