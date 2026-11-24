import { describe, expect, it } from "vitest";
import { filterLabHistory, buildLabHistory } from "./labHistoryModel";
import {
  getLabStages,
  LAB_TEST_ASSIGNMENTS,
  LAB_TEST_CONCEPTS,
  LAB_TEST_STAGE_DEFINITIONS,
} from "./labCatalog";
import type { LabMeasurement } from "./models";

const measurements: Record<string, LabMeasurement[]> = {
  cbc: [
    { id: "cbc-2", date: "2026-10-12", value: "5.1", unit: "10^9/л" },
    { id: "cbc-1", date: "2026-04-03", value: "4.8", unit: "10^9/л" },
  ],
  tsh: [{ id: "tsh-1", date: "2026-08-20", value: "2.1", unit: "мМЕ/л" }],
};

describe("lab history model", () => {
  const stages = getLabStages();
  const entries = buildLabHistory(measurements, stages);

  it("sorts newest first and preserves original units", () => {
    expect(entries.map(entry => entry.id)).toEqual(["cbc-2", "tsh-1", "cbc-1"]);
    expect(entries[1]).toMatchObject({ testId: "tsh", value: "2.1", unit: "мМЕ/л" });
  });

  it("keeps legacy identifiers visible", () => {
    const result = buildLabHistory({ legacy: [{ id: "old-1", date: "2026-01-01", value: "есть", unit: "" }] }, []);
    expect(result[0]).toMatchObject({ testName: "legacy", stageLabel: "Другие исследования" });
  });

  it("preserves every assignment ID from the pre-normalized catalogue", () => {
    // These IDs are persisted as keys in labMeasurements and labUploads.
    // Keep this snapshot aligned with the original LIFE_STAGES assignments.
    expect(LAB_TEST_ASSIGNMENTS.map(assignment => assignment.id)).toEqual([
      "b1", "b2", "b3", "b4", "n3", "n4",
      "ec1", "ec2", "ec3", "ec4",
      "s1", "s2", "s3", "s4", "s5", "s6",
      "r1", "r2", "r3", "r4", "r5", "r6", "r11", "r12", "r13",
      "ya1", "ya2", "ya3", "ya4", "ya5", "ya6", "ya7", "ya8", "ya9", "ya10", "ya11", "ya12", "ya13",
      "a11", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10",
      "th1", "th2", "th3", "fe1", "fe2", "ai1", "ai2", "ai3",
    ]);
    expect(new Set(LAB_TEST_ASSIGNMENTS.map(assignment => assignment.id)).size)
      .toBe(LAB_TEST_ASSIGNMENTS.length);
  });

  it("keeps every assignment connected to an existing concept and stage", () => {
    const conceptIds = new Set(LAB_TEST_CONCEPTS.map(concept => concept.id));
    const stageIds = new Set(LAB_TEST_STAGE_DEFINITIONS.map(stage => stage.id));

    expect(LAB_TEST_CONCEPTS).toHaveLength(42);
    expect(LAB_TEST_ASSIGNMENTS).toHaveLength(57);
    expect(LAB_TEST_STAGE_DEFINITIONS).toHaveLength(10);
    expect(LAB_TEST_ASSIGNMENTS.every(item => conceptIds.has(item.conceptId))).toBe(true);
    expect(LAB_TEST_ASSIGNMENTS.every(item => stageIds.has(item.stageId))).toBe(true);
  });

  it("resolves repeated concepts through their stable stage-specific assignment IDs", () => {
    const result = buildLabHistory({
      ec1: [{ id: "ec1-result", date: "2026-01-01", value: "4.8", unit: "10^9/л" }],
      ya1: [{ id: "ya1-result", date: "2026-02-01", value: "5.0", unit: "10^9/л" }],
    }, stages);

    expect(result).toMatchObject([
      { id: "ya1-result", testId: "ya1", testName: "ОАК", stageLabel: "Молодой взрослый" },
      { id: "ec1-result", testId: "ec1", testName: "ОАК", stageLabel: "Дошкольник" },
    ]);
  });

  it("filters by inclusive date boundaries", () => {
    expect(filterLabHistory(entries, { query: "", fromDate: "2026-08-20", toDate: "2026-10-12" })).toHaveLength(2);
  });

  it("searches test names, values and units", () => {
    expect(filterLabHistory(entries, { query: "cbc", fromDate: "", toDate: "" })).toHaveLength(2);
    expect(filterLabHistory(entries, { query: "мМЕ", fromDate: "", toDate: "" })).toHaveLength(1);
    expect(filterLabHistory(entries, { query: "нет", fromDate: "", toDate: "" })).toHaveLength(0);
  });
});
