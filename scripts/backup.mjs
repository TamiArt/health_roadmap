import { createHash, randomBytes } from "node:crypto";
import { chmodSync, createReadStream, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

function integrityCheck(filename) {
  const database = new DatabaseSync(filename);
  try {
    const result = database.prepare("PRAGMA integrity_check").get();
    if (result?.integrity_check !== "ok") {
      throw new Error(`SQLite integrity check failed: ${result?.integrity_check ?? "no result"}`);
    }
    return true;
  } finally {
    database.close();
  }
}

function sha256(filename) {
  const hash = createHash("sha256");
  return new Promise((resolveHash, reject) => {
    const stream = createReadStream(filename);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

export async function backupDatabase(databasePath, backupDirectory, retentionDays = 14) {
  const source = resolve(databasePath);
  const destinationDirectory = resolve(backupDirectory);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 365) {
    throw new Error("BACKUP_RETENTION_DAYS must be an integer from 1 to 365.");
  }
  if (!statSync(source).isFile()) throw new Error("SQLite database file was not found.");
  mkdirSync(destinationDirectory, { recursive: true });

  const database = new DatabaseSync(source);
  let temporaryPath;
  let databaseClosed = false;
  try {
    database.exec("PRAGMA busy_timeout = 10000");
    const requiredTables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name));
    for (const table of ["users", "sessions", "user_backups", "sync_operations", "change_log"]) {
      if (!requiredTables.has(table)) throw new Error(`SQLite schema is not ready: missing ${table}.`);
    }
    const checkpoint = database.prepare("PRAGMA wal_checkpoint(FULL)").get();
    if (checkpoint?.busy) throw new Error("SQLite WAL checkpoint is busy; retry the backup.");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const filename = `life-maps-${stamp}-${randomBytes(4).toString("hex")}.sqlite`;
    const finalPath = join(destinationDirectory, filename);
    temporaryPath = finalPath + ".tmp";
    rmSync(temporaryPath, { force: true });
    database.prepare("VACUUM INTO ?").run(temporaryPath);
    database.close();
    databaseClosed = true;

    integrityCheck(temporaryPath);
    const checksum = await sha256(temporaryPath);
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, finalPath);
    const manifest = {
      format: "life-maps-sqlite-backup",
      version: 1,
      file: filename,
      createdAt: new Date().toISOString(),
      sha256: checksum,
      integrity: "ok",
    };
    const manifestPath = finalPath + ".manifest.json";
    const manifestTemp = manifestPath + ".tmp";
    writeFileSync(manifestTemp, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
    chmodSync(manifestTemp, 0o600);
    renameSync(manifestTemp, manifestPath);

    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const entry of readdirSync(destinationDirectory)) {
      if (!/^life-maps-\d{8}T\d{6}Z-[a-f0-9]{8}\.sqlite(?:\.manifest\.json)?$/.test(entry)) continue;
      const candidate = join(destinationDirectory, entry);
      if (statSync(candidate).mtimeMs < cutoff) rmSync(candidate, { force: true });
    }
    return { path: finalPath, manifestPath, sha256: checksum };
  } catch (error) {
    if (!databaseClosed) database.close();
    if (temporaryPath) rmSync(temporaryPath, { force: true });
    throw error;
  }
}

export async function verifyBackup(backupPath) {
  const filename = resolve(backupPath);
  const manifestPath = filename + ".manifest.json";
  const { readFile } = await import("node:fs/promises");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.format !== "life-maps-sqlite-backup" || manifest.version !== 1 ||
      manifest.file !== basename(filename) || manifest.integrity !== "ok" ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256)) {
    throw new Error("Backup manifest is invalid or does not match the selected file.");
  }
  if (await sha256(filename) !== manifest.sha256) throw new Error("Backup SHA-256 checksum does not match.");
  integrityCheck(filename);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const databasePath = process.env.DATABASE_PATH ?? "./data/life-maps.sqlite";
  const backupDirectory = process.env.BACKUP_DIR ?? "./backups";
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);
  backupDatabase(databasePath, backupDirectory, retentionDays)
    .then(result => process.stdout.write(JSON.stringify({ event: "backup_created", ...result }) + "\n"))
    .catch(error => {
      process.stderr.write(JSON.stringify({ event: "backup_failed", error: error.message }) + "\n");
      process.exitCode = 1;
    });
}
