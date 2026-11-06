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
      records: { lifeEvents: [], "childHealth:child-1:toothData": {} },
    });

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.records.lifeEvents).toEqual([]);
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
    expect(isAllowedRecordKey("childHealth:child-1:privateNotes")).toBe(false);
    expect(isAllowedRecordKey("credentials")).toBe(false);
  });

  it("round-trips binary attachments through the JSON backup representation", async () => {
    const source = new Blob(["test result file"], { type: "application/pdf" });
    const encoded = await encodeBackupValue({ labUploads: { report: source } });
    const decoded = await decodeBackupValue(encoded) as { labUploads: { report: Blob } };

    expect(decoded.labUploads.report).toBeInstanceOf(Blob);
    expect(decoded.labUploads.report.type).toBe("application/pdf");
    expect(await decoded.labUploads.report.text()).toBe("test result file");
  });

  it("rejects backups created by a newer unsupported schema", () => {
    expect(() => migrateBackup({
      format: BACKUP_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      records: {},
    })).toThrow("Версия резервной копии не поддерживается");
  });
});
