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

  it("resolves same-field conflicts only after an explicit local or server choice", () => {
    const base = payload({ lifeEvents: [{ id: "event-1", title: "Исходное" }] });
    const local = payload({ lifeEvents: [{ id: "event-1", title: "Локальное" }] });
    const remote = payload({ lifeEvents: [{ id: "event-1", title: "Серверное" }] });
    const keepLocal = mergeBackups(base, local, remote, "local");
    const keepRemote = mergeBackups(base, local, remote, "remote");
    expect(keepLocal.conflicts).toEqual([]);
    expect(keepLocal.payload.records.lifeEvents).toEqual([{ id: "event-1", title: "Локальное" }]);
    expect(keepRemote.conflicts).toEqual([]);
    expect(keepRemote.payload.records.lifeEvents).toEqual([{ id: "event-1", title: "Серверное" }]);
  });

  it("propagates a deletion if the other device has not changed that record", () => {
    const base = payload({ lifeEvents: [{ id: "event-1", title: "Событие" }] });
    const local = payload({ lifeEvents: [] });
    const remote = payload({ lifeEvents: [{ id: "event-1", title: "Событие" }] });
    const result = mergeBackups(base, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([]);
  });

  it("merges populated local and server databases on first login without a baseline", () => {
    const local = payload({ lifeEvents: [{ id: "local-event", title: "Локальная история" }] });
    const remote = payload({ lifeEvents: [{ id: "remote-event", title: "Серверная история" }] });
    const result = mergeBackups(null, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([
      { id: "local-event", title: "Локальная история" },
      { id: "remote-event", title: "Серверная история" },
    ]);
  });

  it("keeps first-login collisions unresolved instead of silently choosing a device", () => {
    const local = payload({ lifeEvents: [{ id: "same-event", title: "Локальная версия" }] });
    const remote = payload({ lifeEvents: [{ id: "same-event", title: "Серверная версия" }] });
    const result = mergeBackups(null, local, remote);
    expect(result.conflicts).toContain("records.lifeEvents[same-event].title");
  });

  it("does not resurrect a deleted record when a first-login device has a stale local copy", () => {
    const local = payload({ lifeEvents: [{ id: "old-event", title: "Старая запись", _version: 1 }] });
    const remote = payload({
      lifeEvents: [],
      syncTombstones: { lifeEvents: { "old-event": { version: 1, deletedAt: "2026-11-25T12:00:00.000Z" } } },
    });
    const result = mergeBackups(null, local, remote);
    expect(result.conflicts).toEqual([]);
    expect(result.payload.records.lifeEvents).toEqual([]);
    expect(result.payload.records.syncTombstones).toEqual(remote.records.syncTombstones);
  });

  it("keeps a genuinely newer record when an older tombstone arrives", () => {
    const local = payload({ lifeEvents: [{ id: "event-1", title: "Обновлено", _version: 2 }] });
    const remote = payload({
      lifeEvents: [],
      syncTombstones: { lifeEvents: { "event-1": { version: 1, deletedAt: "2026-11-25T12:00:00.000Z" } } },
    });
    const result = mergeBackups(null, local, remote);
    expect(result.payload.records.lifeEvents).toEqual([{ id: "event-1", title: "Обновлено", _version: 2 }]);
  });

  it("treats untouched defaults as pristine but keeps user-edited defaults", () => {
    expect(isPristineBackup(payload({ lifeEvents: [], vaccineStatuses:
      Object.fromEntries(VACCINES.map(vaccine => [vaccine.id, vaccine.status])),
    }))).toBe(true);
    expect(isPristineBackup(payload({ vaccineStatuses: { hepb: "not-done" } }))).toBe(false);
  });
});
