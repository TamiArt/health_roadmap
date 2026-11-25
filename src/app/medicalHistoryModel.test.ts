import { describe, expect, it } from "vitest";
import { buildMedicalHistory, filterMedicalHistory, parseHistoryDate } from "./medicalHistoryModel";

const stages = [{ id: "blood", label: "Анализы крови", age: "все", tests: [{ id: "cbc", name: "Общий анализ крови" }] }] as any;
const filters = { query: "", kind: "all" as const, profileId: "all", fromDate: "", toDate: "", sort: "newest" as const };

describe("unified medical history", () => {
  const entries = buildMedicalHistory({
    profileId: "adult", profileLabel: "Взрослый профиль", stages,
    measurements: { cbc: [{ id: "m1", date: "2026-02-01", value: "5.4", unit: "ммоль/л" }] },
    uploads: { cbc: [{ id: "file-1", name: "analysis.pdf", date: "20.02.2026", blob: new Blob(["file"]), isPdf: true }] },
    labResults: [{
      id: "lab1", testId: "custom:cbc", testName: "ОАК", date: "2026-03-01",
      indicators: [
        { id: "hb", name: "Гемоглобин", value: 132, unit: "г/л" },
        { id: "wbc", name: "Лейкоциты", value: 6.2, unit: "10^9/л" },
      ],
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
    familyEvents: [{ id: "family1", date: "Лето 2024", title: "Семейное событие", emoji: "💍" }],
  });

  it("normalizes all sources and keeps one timeline event per original record", () => {
    expect(entries.map(entry => entry.kind)).toEqual(["monitoring", "vaccine", "analysis", "document", "manual", "event", "family", "dental"]);
    const analysis = entries.find(entry => entry.id === "analysis:lab1");
    expect(analysis?.details).toContain("Гемоглобин: 132 г/л");
    expect(analysis?.details).toContain("Лейкоциты: 6.2 10^9/л");
    expect(entries.filter(entry => entry.source.recordId === "lab1")).toHaveLength(1);
    expect(analysis?.source).toEqual({ key: "labResultEntries", recordId: "lab1", section: "tests" });
  });

  it("keeps source profile identity and filters by profile/category", () => {
    const child = { ...entries[0], id: "event:child", profileId: "child-1", profileLabel: "Маша" };
    expect(filterMedicalHistory([...entries, child], { ...filters, profileId: "child-1" })).toEqual([child]);
    expect(filterMedicalHistory(entries, { ...filters, kind: "family" })).toHaveLength(1);
  });

  it("filters by date range and searchable details", () => {
    expect(filterMedicalHistory(entries, { ...filters, query: "гемоглобин", kind: "analysis" })).toHaveLength(1);
    expect(filterMedicalHistory(entries, { ...filters, kind: "event", fromDate: "2026-02-01" })).toHaveLength(0);
    expect(filterMedicalHistory(entries, { ...filters, query: "пломба" })).toHaveLength(1);
    expect(filterMedicalHistory(entries, { ...filters, query: "analysis.pdf", kind: "document" })).toHaveLength(1);
  });

  it("sorts exact and partial dates deterministically and leaves undated entries last", () => {
    const newest = filterMedicalHistory(entries, filters);
    expect(newest[0].date).toBe("2026-05-02");
    expect(newest.at(-1)?.kind).toBe("dental");
    const oldest = filterMedicalHistory(entries, { ...filters, sort: "oldest" });
    expect(oldest[0].date).toBe("2024-06-01");
    expect(entries[0].date).toBe("2026-05-02");
  });

  it("parses exact, month, season, year and invalid dates without inventing precision", () => {
    expect(parseHistoryDate("2026-11-25")).toMatchObject({ datePrecision: "day", sortDate: "2026-11-25" });
    expect(parseHistoryDate("03.2024")).toMatchObject({ datePrecision: "month", dateLabel: "03.2024 (месяц)" });
    expect(parseHistoryDate("Лето 2024")).toMatchObject({ datePrecision: "season", dateLabel: "лето 2024 (период)", sortDate: "2024-06-01" });
    expect(parseHistoryDate("2000")).toMatchObject({ datePrecision: "year", dateLabel: "2000" });
    expect(parseHistoryDate("31.02.2024")).toMatchObject({ date: null, datePrecision: "unknown" });
    expect(parseHistoryDate("")).toMatchObject({ date: null, datePrecision: "unknown" });
  });

  it("includes partial-date periods when a date filter intersects the period", () => {
    const summer = parseHistoryDate("Лето 2024");
    const partial = { ...entries[0], id: "family:summer", kind: "family" as const, ...summer };
    expect(filterMedicalHistory([partial], { ...filters, fromDate: "2024-08-30", toDate: "2024-08-31" })).toHaveLength(1);
    expect(filterMedicalHistory([partial], { ...filters, fromDate: "2024-09-01", toDate: "" })).toHaveLength(0);
  });

  it("orders same-day and historical records deterministically", () => {
    const sameDay = [
      { ...entries[0], id: "event:z", sortDate: "2001-01-01", date: "2001-01-01", dateEnd: "2001-01-01" },
      { ...entries[0], id: "event:a", sortDate: "2001-01-01", date: "2001-01-01", dateEnd: "2001-01-01" },
    ];
    expect(filterMedicalHistory(sameDay, { ...filters, sort: "oldest" }).map(entry => entry.id)).toEqual(["event:a", "event:z"]);
    expect(filterMedicalHistory(sameDay, filters).map(entry => entry.id)).toEqual(["event:a", "event:z"]);
  });

  it("supports large histories without mutating source order", () => {
    const large = Array.from({ length: 1000 }, (_, index) => ({
      ...entries[0], id: `event:${index}`, source: { key: "healthEvents", recordId: String(index), section: "events" as const },
      kind: "event" as const, sortDate: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
      title: `Контрольное событие ${index}`, details: "", searchable: `batch-${index % 10}`,
    }));
    const filtered = filterMedicalHistory(large, { ...filters, query: "batch-7", kind: "event" });
    expect(filtered).toHaveLength(100);
    expect(filtered.every(entry => entry.searchable === "batch-7")).toBe(true);
    expect(large[0].id).toBe("event:0");
  });
});
