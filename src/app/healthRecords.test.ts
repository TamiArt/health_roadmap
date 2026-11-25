import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  nextOccurrence,
  validateHealthEvent,
  validateLabResult,\n  validateVaccineAdministration,\n  validateMonitoringReading,
  validateMonitoringItem,
} from "./healthRecords";

describe("health record validation", () => {
  it("accepts real calendar dates and rejects impossible dates", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2025-13-01")).toBe(false);
  });

  it("requires a valid dated medical event", () => {
    expect(validateHealthEvent({
      date: "2025-03-12",
      kind: "fracture",
      title: "Перелом руки",
      description: "",
      facility: "",
    })).toBeNull();
    expect(validateHealthEvent({
      date: "2025-02-30",
      kind: "fracture",
      title: "Перелом руки",
      description: "",
      facility: "",
    })).toContain("дату");
  });

  it("validates monitoring intervals and reminder settings", () => {
    expect(validateMonitoringItem({
      name: "Глюкоза крови",
      kind: "measurement",
      unit: "ммоль/л",
      intervalDays: 30,
      nextDueDate: "2025-04-01",
      lastCheckedDate: "",
      notes: "",
      reminder: { enabled: true, leadDays: 3, time: "09:00" },
    })).toBeNull();
  });

  it("requires numeric indicators for each saved lab result", () => {
    expect(validateLabResult({
      testId: "custom:cbc",
      testName: "Общий анализ крови",
      date: "2025-04-01",
      indicators: [{ id: "i1", name: "Гемоглобин", value: 132, unit: "г/л" }],
      notes: "",
    })).toBeNull();
    expect(validateLabResult({
      testId: "custom:cbc",
      testName: "Общий анализ крови",
      date: "2025-04-01",
      indicators: [{ id: "i1", name: "Гемоглобин", value: Number.NaN, unit: "г/л" }],
      notes: "",
    })).toContain("Проверьте");
  });
});

describe("yearly reminder occurrence", () => {
  it("finds the next annual occurrence after this year's date has passed", () => {
    const next = nextOccurrence("2000-05-10", true, new Date(2025, 5, 1));
    expect(next?.getFullYear()).toBe(2026);
    expect(next?.getMonth()).toBe(4);
    expect(next?.getDate()).toBe(10);
  });

  it("does not schedule a one-time date in the past", () => {
    expect(nextOccurrence("2020-05-10", false, new Date(2025, 5, 1))).toBeNull();
  });
});
  it("validates dated vaccine administrations and required dose details", () => {
    const valid = { vaccineId: "mmr", vaccineName: "MMR", date: "2026-04-12", dose: "1", facility: "", notes: "" };
    expect(validateVaccineAdministration(valid)).toBeNull();
    expect(validateVaccineAdministration({ ...valid, date: "2026-02-30" })).toContain("дату");
    expect(validateVaccineAdministration({ ...valid, dose: " " })).toContain("дозу");
  });

  it("validates manual monitoring readings without accepting invalid dates or non-finite values", () => {
    expect(validateMonitoringReading({ date: "2026-04-12", value: "5.2" })).toBeNull();
    expect(validateMonitoringReading({ date: "2026-02-30", value: "5.2" })).toContain("дату");
    expect(validateMonitoringReading({ date: "2026-04-12", value: "Infinity" })).toContain("числовое");
  });

