import { describe, expect, it } from "vitest";
import { filterLabHistory, buildLabHistory } from "./labHistoryModel";
import { getLabStages } from "./labCatalog";
import type { LabMeasurement } from "./models";
const measurements: Record<string, LabMeasurement[]> = {
  cbc: [
    { id: "cbc-2", date: "2026-10-12", value: "5.1", unit: "10^9/л" },
    { id: "cbc-1", date: "2026-04-03", value: "4.8", unit: "10^9/л" },
  ],
  tsh: [{ id: "tsh-1", date: "2026-08-20", value: "2.1", unit: "мМЕ/л" }],
};
describe("lab history model", () => {
  const entries = buildLabHistory(measurements, getLabStages());
  it("sorts newest first and preserves original units", () => {
    expect(entries.map(entry => entry.id)).toEqual(["cbc-2", "tsh-1", "cbc-1"]);
    expect(entries[1]).toMatchObject({ testId: "tsh", value: "2.1", unit: "мМЕ/л" });
  });
  it("keeps legacy identifiers visible", () => {
    const result = buildLabHistory({ legacy: [{ id: "old-1", date: "2026-01-01", value: "есть", unit: "" }] }, []);
    expect(result[0]).toMatchObject({ testName: "legacy", stageLabel: "Другие исследования" });
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
