import { afterEach, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { backupDatabase, verifyBackup } from "./backup.mjs";
import { restoreDatabase } from "./restore.mjs";
import { checkLatestBackup } from "./backup-health.mjs";

const directories = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "life-maps-backup-"));
  directories.push(directory);
  const databasePath = join(directory, "life-maps.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL; CREATE TABLE users (id TEXT PRIMARY KEY); CREATE TABLE sessions (id TEXT PRIMARY KEY); CREATE TABLE user_backups (id TEXT PRIMARY KEY); CREATE TABLE sync_operations (id TEXT PRIMARY KEY); CREATE TABLE change_log (id TEXT PRIMARY KEY); CREATE TABLE medical_records (id TEXT PRIMARY KEY, payload TEXT NOT NULL); INSERT INTO medical_records VALUES ('record-1', 'encrypted-value')");
  database.close();
  return { directory, databasePath, backupDirectory: join(directory, "backups") };
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

it("creates a consistent SQLite backup and verifies its checksum and integrity", async () => {
  const { databasePath, backupDirectory } = fixture();
  const backup = await backupDatabase(databasePath, backupDirectory, 14);
  const manifest = await verifyBackup(backup.path);
  assert.equal(manifest.integrity, "ok");
  const restored = new DatabaseSync(backup.path);
  assert.equal(restored.prepare("SELECT payload FROM medical_records WHERE id = ?").get("record-1").payload, "encrypted-value");
  assert.equal(restored.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  restored.close();
});

it("refuses tampered backup and restores a verified snapshot with a pre-restore safety copy", async () => {
  const { databasePath, backupDirectory } = fixture();
  const backup = await backupDatabase(databasePath, backupDirectory, 14);
  const changed = new DatabaseSync(databasePath);
  changed.prepare("UPDATE medical_records SET payload = ? WHERE id = ?").run("newer-value", "record-1");
  changed.close();

  const result = await restoreDatabase(databasePath, backup.path, backupDirectory);
  assert.ok(result.safetyBackup);
  const restored = new DatabaseSync(databasePath);
  assert.equal(restored.prepare("SELECT payload FROM medical_records WHERE id = ?").get("record-1").payload, "encrypted-value");
  restored.close();

  const tampered = join(backupDirectory, "tampered.sqlite");
  const { copyFileSync, appendFileSync } = await import("node:fs");
  copyFileSync(backup.path, tampered);
  appendFileSync(tampered, "tampered");
  await assert.rejects(() => verifyBackup(tampered), /manifest|checksum/i);
});

it("reports backup freshness and detects stale backup sets", async () => {
  const { databasePath, backupDirectory } = fixture();
  await backupDatabase(databasePath, backupDirectory, 14);
  const healthy = await checkLatestBackup(backupDirectory, 30);
  assert.equal(healthy.integrity, "ok");
  await assert.rejects(() => checkLatestBackup(backupDirectory, 1, Date.now() + 2 * 60 * 60 * 1000), /stale/i);
});
