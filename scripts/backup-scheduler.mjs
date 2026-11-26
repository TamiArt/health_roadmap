import { setTimeout as delay } from "node:timers/promises";
import { existsSync } from "node:fs";
import { backupDatabase } from "./backup.mjs";

const databasePath = process.env.DATABASE_PATH ?? "/app/data/life-maps.sqlite";
const backupDirectory = process.env.BACKUP_DIR ?? "/backups";
const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);
const intervalHours = Number(process.env.BACKUP_INTERVAL_HOURS ?? 24);
const maxAgeHours = Number(process.env.BACKUP_MAX_AGE_HOURS ?? 30);
if (!Number.isFinite(intervalHours) || intervalHours < 1 || intervalHours > 168) {
  throw new Error("BACKUP_INTERVAL_HOURS must be between 1 and 168.");
}
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= intervalHours || maxAgeHours > 744) {
  throw new Error("BACKUP_MAX_AGE_HOURS must exceed the backup interval and be at most 744.");
}

async function runBackup() {
  while (true) {
    while (!existsSync(databasePath)) {
      process.stdout.write(JSON.stringify({ event: "backup_waiting_for_database" }) + "\n");
      await delay(30_000);
    }
    try {
      const result = await backupDatabase(databasePath, backupDirectory, retentionDays);
      process.stdout.write(JSON.stringify({ event: "backup_created", ...result }) + "\n");
      return;
    } catch (error) {
      process.stderr.write(JSON.stringify({ event: "backup_failed_retrying", error: error.message }) + "\n");
      await delay(5 * 60 * 1000);
    }
  }
}

await runBackup();
while (true) {
  await delay(intervalHours * 60 * 60 * 1000);
  await runBackup();
}
