import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyBackup } from "./backup.mjs";

export async function checkLatestBackup(backupDirectory, maxAgeHours = 30, now = Date.now()) {
  if (!Number.isFinite(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 744) {
    throw new Error("BACKUP_MAX_AGE_HOURS must be between 1 and 744.");
  }
  const directory = resolve(backupDirectory);
  const candidates = readdirSync(directory)
    .filter(name => /^life-maps-\d{8}T\d{6}Z-[a-f0-9]{8}\.sqlite$/.test(name))
    .map(name => ({ path: join(directory, name), modifiedAt: statSync(join(directory, name)).mtimeMs }))
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
  if (!candidates.length) throw new Error("No completed SQLite backup was found.");
  const latest = candidates[0];
  const ageHours = (now - latest.modifiedAt) / (60 * 60 * 1000);
  if (ageHours > maxAgeHours) throw new Error(`Latest backup is stale (${ageHours.toFixed(1)} hours old).`);
  const manifest = await verifyBackup(latest.path);
  return { path: latest.path, ageHours, sha256: manifest.sha256, integrity: manifest.integrity };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.env.BACKUP_DIR ?? "/backups";
  const maxAge = Number(process.env.BACKUP_MAX_AGE_HOURS ?? 30);
  checkLatestBackup(directory, maxAge)
    .then(result => process.stdout.write(JSON.stringify({ event: "backup_health_ok", ...result }) + "\n"))
    .catch(error => {
      process.stderr.write(JSON.stringify({ event: "backup_health_failed", error: error.message }) + "\n");
      process.exitCode = 1;
    });
}
