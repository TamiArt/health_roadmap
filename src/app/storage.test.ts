import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMAT,
  CURRENT_SCHEMA_VERSION,
  decodeBackupValue,
  encodeBackupValue,
  isAllowedRecordKey,
  migrateBackup,
  type BackupPayload,
} from "./storage";

describe("local backup schema", () => {
  it("accepts the current backup format and preserves records", () => {
    const input: BackupPayload = {
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-11-06T00:00:00.000Z",
      records: { lifeEvents: [], vaccineStatuses: {} },
    };

    expect(migrateBackup(input)).toEqual(input);
  });

  it("migrates a version-zero backup to the current schema", () => {
    const migrated = migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: 0,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: { lifeEvents: [], children: [{ id: "child-1", name: "Ребёнок" }], "childHealth:child-1:toothData": {} },
    });

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.records.lifeEvents).toEqual([]);
  });

  it("preserves vaccination records and rejects malformed vaccine history", () => {
    const payload: BackupPayload = {
      format: BACKUP_FORMAT, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: "2026-11-25T00:00:00.000Z",
      records: { vaccineRecords: [{ id: "dose-1", vaccineId: "mmr", vaccineName: "MMR", date: "2026-04-12", dose: "1", facility: "", notes: "" }] },
    };
    expect(migrateBackup(payload)).toEqual(payload);
    const vaccine = (payload.records.vaccineRecords as Array<Record<string, unknown>>)[0];
    expect(() => migrateBackup({ ...payload, records: { vaccineRecords: [{ ...vaccine, date: "2026-02-30" }] } })).toThrow("история вакцинации");
  });

  it("rejects unknown record types rather than silently importing them", () => {
    expect(() => migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: { credentials: { token: "never" } },
    })).toThrow("Неизвестный тип данных");
  });

  it("only allows known top-level and child-health record keys", () => {
    expect(isAllowedRecordKey("lifeEvents")).toBe(true);
    expect(isAllowedRecordKey("childHealth:child-1:toothData")).toBe(true);
    expect(isAllowedRecordKey("labUploads")).toBe(true);
    expect(isAllowedRecordKey("childHealth:child-1:labUploads")).toBe(true);
    expect(isAllowedRecordKey("labMeasurements")).toBe(true);
    expect(isAllowedRecordKey("childHealth:child-1:labMeasurements")).toBe(true);
    expect(isAllowedRecordKey("childHealth:child-1:privateNotes")).toBe(false);
    expect(isAllowedRecordKey("credentials")).toBe(false);
  });

  it("preserves manually entered lab measurements and rejects malformed measurement records", () => {
    const measurement = { id: "measurement-1", date: "2026-11-06", value: "5.4", unit: "ммоль/л" };
    const backup: BackupPayload = {
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-11-06T00:00:00.000Z",
      records: { children: [{ id: "child-1", name: "Ребёнок" }], labMeasurements: { cbc: [measurement] }, "childHealth:child-1:labMeasurements": { ferritin: [measurement] } },
    };

    expect(migrateBackup(backup).records.labMeasurements).toEqual({ cbc: [measurement] });
    expect(() => migrateBackup({ ...backup, records: { labMeasurements: { cbc: [{ ...measurement, date: "2026-02-30" }] } } }))
      .toThrow("Повреждены значения анализов");
    expect(() => migrateBackup({ ...backup, records: { labMeasurements: { cbc: "5.4" } } }))
      .toThrow("Повреждены значения анализов");
  });

  it("round-trips binary attachments through the JSON backup representation", async () => {
    const source = new Blob(["test result file"], { type: "application/pdf" });
    const encoded = await encodeBackupValue({ labUploads: { report: source } });
    const decoded = await decodeBackupValue(encoded) as { labUploads: { report: Blob } };

    expect(decoded.labUploads.report).toBeInstanceOf(Blob);
    expect(decoded.labUploads.report.type).toBe("application/pdf");
    expect(await decoded.labUploads.report.text()).toBe("test result file");
  });

  it("rejects malformed Base64 attachment data before import", async () => {
    await expect(decodeBackupValue({
      report: { __lifeMapsBlob: true, mimeType: "application/pdf", base64: "not-base64" },
    })).rejects.toThrow("Некорректное кодирование вложения");
  });

  it("migrates legacy child-profile records and preserves every attachment", async () => {
    const encodedBlob = { __lifeMapsBlob: true, mimeType: "application/pdf", base64: btoa("child report") };
    const measurement = { id: "child-measurement", date: "2026-11-06", value: "5.4", unit: "ммоль/л" };
    const legacy: BackupPayload = {
      format: BACKUP_FORMAT,
      schemaVersion: 0,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: {
        children: [{ id: "child-1", name: "Ребёнок" }],
        "childHealth:child-1:vaccineStatuses": { vaccineA: "done" },
        "childHealth:child-1:toothData": { 11: { status: "healthy", note: "запись" } },
        "childHealth:child-1:labUploads": { cbc: [{ id: "upload-1", name: "child.pdf", blob: encodedBlob }] },
        "childHealth:child-1:labMeasurements": { cbc: [measurement] },
        "childHealth:child-1:healthEvents": [{ id: "event-1", date: "2026-11-06", title: "Осмотр" }],
        "childHealth:child-1:healthMonitoring": [{
          id: "monitor-1", name: "Контроль", kind: "measurement", unit: "ммоль/л",
          intervalDays: null, nextDueDate: "2026-12-06", lastCheckedDate: "2026-11-06",
          notes: "", reminder: { enabled: false, leadDays: 0, time: "09:00" },
          measurements: [{ id: "reading-1", date: "2026-11-06", value: 5.4, unit: "ммоль/л" }],
        }],
        "childHealth:child-1:labResultEntries": [{
          id: "lab-1", testId: "cbc", testName: "Общий анализ", date: "2026-11-06",
          indicators: [{ id: "hb", name: "Гемоглобин", value: 125, unit: "г/л" }],
          document: { id: "document-1", name: "result.pdf", mimeType: "application/pdf", blob: encodedBlob },
          notes: "",
        }],
        healthEvents: [{ id: "adult-event", date: "2026-11-06", title: "Взрослая запись" }],
      },
    };

    const migrated = migrateBackup(legacy);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.records["childHealth:child-1:healthEvents"]).toEqual(legacy.records["childHealth:child-1:healthEvents"]);
    expect(migrated.records["childHealth:child-1:labMeasurements"]).toEqual({ cbc: [measurement] });

    const decoded = await decodeBackupValue(migrated.records) as Record<string, any>;
    const upload = decoded["childHealth:child-1:labUploads"].cbc[0].blob as Blob;
    const labDocument = decoded["childHealth:child-1:labResultEntries"][0].document.blob as Blob;
    expect(await upload.text()).toBe("child report");
    expect(await labDocument.text()).toBe("child report");
    expect(decoded.healthEvents[0].id).toBe("adult-event");
  });

  it("rejects child health records whose profile is missing from a backup", () => {
    expect(() => migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: { children: [], "childHealth:deleted-child:healthEvents": [{ id: "orphan" }] },
    })).toThrow("отсутствующего профиля ребёнка");
  });

  it("rejects malformed child-profile keys and child lab attachments", () => {
    expect(isAllowedRecordKey("childHealth:../other:healthEvents")).toBe(false);
    expect(() => migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: { "childHealth:child-1:labUploads": { cbc: [{ id: "bad", blob: { nope: true } }] } },
    })).toThrow("Повреждены вложения");
  });

  it("rejects impossible medical dates and duplicate record identifiers", () => {
    const base: BackupPayload = {
      format: BACKUP_FORMAT, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: "2026-11-25T00:00:00.000Z",
      records: { children: [{ id: "child-1", name: "Ребёнок" }] },
    };
    expect(() => migrateBackup({ ...base, records: { healthEvents: [{ id: "event-1", date: "2026-02-30", title: "Осмотр" }] } }))
      .toThrow("даты медицинских событий");
    expect(() => migrateBackup({ ...base, records: { children: [{ id: "child-1" }, { id: "child-1" }] } }))
      .toThrow("повторяющиеся идентификаторы");
    expect(() => migrateBackup({ ...base, records: { labResultEntries: [{
      id: "lab-1", testName: "ОАК", date: "2026-02-30",
      indicators: [{ id: "hb", name: "Hb", value: 120, unit: "г/л" }],
    }] } })).toThrow("история результатов анализов");
  });

  it("rejects backups created by a newer unsupported schema", () => {
    expect(() => migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: {},
    })).toThrow("Версия резервной копии не поддерживается");
  });
  it("round-trips multiple Blob documents attached to one medical record", async () => {
    const source = {
      documents: [
        { id: "doc-1", name: "first.pdf", mimeType: "application/pdf", blob: new Blob(["first"]) },
        { id: "doc-2", name: "second.pdf", mimeType: "application/pdf", blob: new Blob(["second"]) },
      ],
    };
    const encoded = await encodeBackupValue(source);
    const decoded = await decodeBackupValue(encoded) as typeof source;
    expect(decoded.documents).toHaveLength(2);
    expect(await decoded.documents[0].blob.text()).toBe("first");
    expect(await decoded.documents[1].blob.text()).toBe("second");
  });

});
