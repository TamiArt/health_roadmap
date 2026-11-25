import { describe, expect, it } from "vitest";
import { mergeBackups, isPristineBackup } from "./syncMerge";
import type { BackupPayload } from "./storage";
import { VACCINES } from "./healthData";
const payload = (records: Record<string, unknown>): BackupPayload => ({
  format: "life-maps-backup", schemaVersion: 1, exportedAt: "2026-11-25T00:00:00.000Z", records,
});

describe("multi-device backup merge", () => {
  it("combines independent records created on two devices", () => {
    const base = payload({ lifeEvents: [] });
    const local = payload({ lifeEvents: [{ id: "local", title: "Локальная запись" }] });
    const remote = payload({ lifeEvents: [{ id: "remote", title: "Удалённая запись" }] });
    const result = mergeBackups(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([
      { id: "local", title: "Локальная запись" }, { id: "remote", title: "Удалённая запись" },
    ]);
  });

  it("merges independent field edits to the same record", () => {
    const base = payload({ lifeEvents: [{ id: "event-1", title: "Событие", notes: "" }] });
    const local = payload({ lifeEvents: [{ id: "event-1", title: "Новое название", notes: "" }] });
    const remote = payload({ lifeEvents: [{ id: "event-1", title: "Событие", notes: "Комментарий" }] });
    const result = mergeBackups(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([
      { id: "event-1", title: "Новое название", notes: "Комментарий" },
    ]);
  });

  it("stops on concurrent edits to the same field without choosing a winner", () => {
    const base = payload({ lifeEvents: [{ id: "event-1", title: "Исходное" }] });
    const local = payload({ lifeEvents: [{ id: "event-1", title: "Локальное" }] });
    const remote = payload({ lifeEvents: [{ id: "event-1", title: "Удалённое" }] });
    const result = mergeBackups(base, local, remote);
    expect(result.conflicts).toContain("records.lifeEvents[event-1].title");
  });

  it("propagates a deletion if the other device has not changed that record", () => {
    const base = payload({ lifeEvents: [{ id: "event-1", title: "Событие" }] });
    const local = payload({ lifeEvents: [] });
    const remote = payload({ lifeEvents: [{ id: "event-1", title: "Событие" }] });
    const result = mergeBackups(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([]);
  });

  it("treats untouched defaults as pristine but keeps user-edited defaults", () => {
    expect(isPristineBackup(payload({ lifeEvents: [], vaccineStatuses:
      Object.fromEntries(VACCINES.map(vaccine => [vaccine.id, vaccine.status])),
    }))).toBe(true);
    expect(isPristineBackup(payload({ vaccineStatuses: { hepb: "not-done" } }))).toBe(false);
  });
});
