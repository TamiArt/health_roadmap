import { copyFileSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { backupDatabase, verifyBackup } from "./backup.mjs";

function assertIntegrity(filename) {
  const database = new DatabaseSync(filename);
  try {
    const result = database.prepare("PRAGMA integrity_check").get();
    if (result?.integrity_check !== "ok") throw new Error("Restored SQLite integrity check failed.");
  } finally {
    database.close();
  }
}

export async function restoreDatabase(databasePath, backupPath, backupDirectory) {
  const target = resolve(databasePath);
  const source = resolve(backupPath);
  if (!statSync(source).isFile()) throw new Error("Selected backup file does not exist.");
  const manifest = await verifyBackup(source);
  mkdirSync(dirname(target), { recursive: true });

  const safetyDirectory = resolve(backupDirectory, "pre-restore");
  let safetyBackup = null;
  try {
    if (statSync(target).isFile()) {
      safetyBackup = (await backupDatabase(target, safetyDirectory, 365)).path;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const temporaryTarget = target + ".restore.tmp";
  rmSync(temporaryTarget, { force: true });
  copyFileSync(source, temporaryTarget);
  assertIntegrity(temporaryTarget);
  renameSync(temporaryTarget, target);
  rmSync(target + "-wal", { force: true });
  rmSync(target + "-shm", { force: true });
  assertIntegrity(target);
  return { restoredFrom: source, restoredSha256: manifest.sha256, safetyBackup };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const backupPath = process.argv[2];
  if (!backupPath || !process.argv.includes("--confirm")) {
    process.stderr.write("Usage: node scripts/restore.mjs /backups/file.sqlite --confirm\n");
    process.exit(2);
  }
  const databasePath = process.env.DATABASE_PATH ?? "./data/life-maps.sqlite";
  const backupDirectory = process.env.BACKUP_DIR ?? "./backups";
  restoreDatabase(databasePath, backupPath, backupDirectory)
    .then(result => process.stdout.write(JSON.stringify({ event: "backup_restored", ...result }) + "\n"))
    .catch(error => {
      process.stderr.write(JSON.stringify({ event: "restore_failed", error: error.message }) + "\n");
      process.exitCode = 1;
    });
}
