import { describe, expect, it } from "vitest";
import { buildAnalyticsSeries, filterAnalyticsSeries, getReferenceStatus, getSeriesChange, parseReferenceRange } from "./analyticsModel";
import type { HealthMonitoringItem, LabResultEntry } from "./healthRecords";
import type { LabMeasurement } from "./models";

describe("medical analytics model", () => {
  it("parses bounded, one-sided and invalid reference ranges", () => {
    expect(parseReferenceRange("3,5–5,5")).toEqual({ lower: 3.5, upper: 5.5 });
    expect(parseReferenceRange("< 5.2")).toEqual({ upper: 5.2 });
    expect(parseReferenceRange("от 4")).toEqual({ lower: 4, lowerInclusive: true });
    expect(parseReferenceRange("<= 5,2")).toEqual({ upper: 5.2, upperInclusive: true });
    expect(parseReferenceRange("> 4")).toEqual({ lower: 4, lowerInclusive: false });
    expect(parseReferenceRange("по возрасту")).toBeNull();
  });
  it("classifies values only when a numeric reference was supplied", () => {
    expect(getReferenceStatus(3, "4-6")).toBe("low");
    expect(getReferenceStatus(5, "4-6")).toBe("normal");
    expect(getReferenceStatus(7, "4-6")).toBe("high");
    expect(getReferenceStatus(7, "по возрасту")).toBe("unknown");
    expect(getReferenceStatus(4, "< 5")).toBe("normal");
    expect(getReferenceStatus(5, "< 5")).toBe("high");
    expect(getReferenceStatus(5, "≤ 5")).toBe("normal");
    expect(getReferenceStatus(6, "< 5")).toBe("high");
    expect(getReferenceStatus(4, "> 4")).toBe("low");
    expect(getReferenceStatus(4, "≥ 4")).toBe("normal");
    expect(getReferenceStatus(3, "> 4")).toBe("low");
  });
  it("combines only equal indicator names and units and preserves source references", () => {
    const results: LabResultEntry[] = [{ id: "study-1", testId: "cbc", testName: "ОАК", date: "2026-01-02", notes: "", indicators: [
      { id: "i1", name: "Гемоглобин", value: 120, unit: "г/л", referenceRange: "120-160" },
      { id: "i2", name: "Глюкоза", value: 5, unit: "ммоль/л" },
    ] }];
    const manual: Record<string, LabMeasurement[]> = { hemoglobin: [{ id: "m1", date: "2025-01-02", value: "115", unit: "г/л" }] };
    const monitoring: HealthMonitoringItem[] = [{ id: "weight", name: "Вес", kind: "measurement", unit: "кг", intervalDays: null, nextDueDate: "2026-12-01", lastCheckedDate: "", notes: "", reminder: { enabled: false, leadDays: 0, time: "09:00" }, measurements: [{ id: "r1", date: "2026-01-01", value: 70, unit: "кг" }] }];
    const series = buildAnalyticsSeries(results, manual, new Map([["hemoglobin", "Гемоглобин"]]), monitoring);
    const hemoglobin = series.find(item => item.name === "Гемоглобин");
    expect(hemoglobin?.points.map(point => point.value)).toEqual([115, 120]);
    expect(hemoglobin?.points[1].sourceId).toBe("study-1");
    expect(series.some(item => item.name === "Вес" && item.category === "monitoring")).toBe(true);
  });
  it("normalizes whitespace in indicator names and units without merging different units", () => {
    const results: LabResultEntry[] = [
      { id: "a", testId: "x", testName: "Анализ", date: "2026-01-01", notes: "", indicators: [{ id: "a1", name: "  С-реактивный   белок ", value: 2, unit: "мг/л" }] },
      { id: "b", testId: "x", testName: "Анализ", date: "2026-02-01", notes: "", indicators: [{ id: "b1", name: "С-реактивный белок", value: 3, unit: " мг/л " }] },
      { id: "c", testId: "x", testName: "Анализ", date: "2026-03-01", notes: "", indicators: [{ id: "c1", name: "С-реактивный белок", value: 4, unit: "г/л" }] },
    ];
    const series = buildAnalyticsSeries(results, {}, new Map(), []);
    expect(series).toHaveLength(2);
    expect(series.find(item => item.unit === "мг/л")?.points).toHaveLength(2);
  });
  it("filters by category, period and query without mutating source data", () => {
    const series = buildAnalyticsSeries([{ id: "s", testId: "x", testName: "Анализ", date: "2026-02-01", notes: "", indicators: [{ id: "a", name: "Ферритин", value: 40, unit: "нг/мл" }] }], {}, new Map(), []);
    expect(filterAnalyticsSeries(series, { category: "laboratory", query: "фер", fromDate: "2026-01-01", toDate: "2026-03-01" })).toHaveLength(1);
    expect(filterAnalyticsSeries(series, { category: "monitoring", query: "", fromDate: "", toDate: "" })).toHaveLength(0);
    expect(series[0].points).toHaveLength(1);
  });
  it("calculates absolute and relative changes safely when the baseline is zero", () => {
    expect(getSeriesChange([{ id: "1", date: "2025-01-01", value: 0, unit: "", source: "manual", sourceId: "1", sourceLabel: "" }, { id: "2", date: "2026-01-01", value: 5, unit: "", source: "manual", sourceId: "2", sourceLabel: "" }])).toMatchObject({ delta: 5, percent: null, direction: "up" });
  });
});
