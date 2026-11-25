import type { BackupPayload } from "./storage";
import { VACCINES } from "./healthData";
const missing = Symbol("missing");
type Value = unknown | typeof missing;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeValue(base: Value, local: Value, remote: Value, path: string, conflicts: string[], strategy?: "local" | "remote"): Value {
  if (equal(local, base)) return remote;
  if (equal(remote, base) || equal(local, remote)) return local;
  if (Array.isArray(local) && Array.isArray(remote) && (base === missing || Array.isArray(base))) {
    const all = [...local, ...remote, ...(Array.isArray(base) ? base : [])];
    if (!all.every(v => isObject(v) && typeof v.id === "string")) { if (strategy) return strategy === "local" ? local : remote; conflicts.push(path); return local; }
    const map = (values: unknown[]) => new Map(values.map(v => [(v as {id:string}).id, v]));
    const b = map(Array.isArray(base) ? base : []), l = map(local), r = map(remote), out: unknown[] = [];
    for (const id of new Set([...l.keys(), ...r.keys(), ...b.keys()])) {
      const v = mergeValue(b.has(id) ? b.get(id) : missing, l.has(id) ? l.get(id) : missing,
        r.has(id) ? r.get(id) : missing, `${path}[${id}]`, conflicts, strategy);
      if (v !== missing) out.push(v);
    }
    return out;
  }
  if (isObject(local) && isObject(remote) && (base === missing || isObject(base))) {
    const b = base === missing ? {} : base as Record<string, unknown>, out: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(b), ...Object.keys(local), ...Object.keys(remote)])) {
      const v = mergeValue(Object.hasOwn(b,key) ? b[key] : missing,
        Object.hasOwn(local,key) ? local[key] : missing, Object.hasOwn(remote,key) ? remote[key] : missing,
        path ? `${path}.${key}` : key, conflicts, strategy);
      if (v !== missing) out[key] = v;
    }
    return out;
  }
  if (local === missing || remote === missing || base === missing) {
    if (local === missing && remote === missing) return missing;
    if (base === missing && local === missing) return remote;
    if (base === missing && remote === missing) return local;
    if (strategy) return strategy === "local" ? local : remote;
    conflicts.push(path); return local;
  }
  if (strategy) return strategy === "local" ? local : remote;
  conflicts.push(path); return local;
}

function applyTombstones(records: Record<string, unknown>, tombstones: unknown): void {
  if (!isObject(tombstones)) return;
  for (const [path, deleted] of Object.entries(tombstones)) {
    if (!isObject(deleted)) continue;
    const parts = path.split(".");
    const collection = parts.length === 1 ? records[parts[0]] :
      isObject(records[parts[0]]) ? (records[parts[0]] as Record<string, unknown>)[parts[1]] : undefined;
    if (Array.isArray(collection)) {
      const filtered = collection.filter(item => {
        if (!isObject(item) || typeof item.id !== "string") return true;
        const tombstone = deleted[item.id];
        if (!isObject(tombstone)) return true;
        const recordVersion = typeof item._version === "number" ? item._version : 0;
        const deletedVersion = typeof tombstone.version === "number" ? tombstone.version : Number.MAX_SAFE_INTEGER;
        return recordVersion > deletedVersion;
      });
      if (parts.length === 1) records[parts[0]] = filtered;
      else if (isObject(records[parts[0]])) (records[parts[0]] as Record<string, unknown>)[parts[1]] = filtered;
    }
    if (parts[0] === "children") {
      for (const id of Object.keys(deleted)) {
        if (!isObject(deleted[id])) continue;
        const childKeyPrefix = "childHealth:" + id + ":";
        for (const key of Object.keys(records)) if (key.startsWith(childKeyPrefix)) delete records[key];
      }
    }
  }
}

export function mergeBackups(base: BackupPayload | null, local: BackupPayload, remote: BackupPayload, strategy?: "local" | "remote") {
  const conflicts: string[] = [];
  const records = mergeValue(base?.records ?? missing, local.records, remote.records, "records", conflicts, strategy);
  const mergedRecords = (isObject(records) ? records : {}) as Record<string, unknown>;
  const tombstones = isObject(mergedRecords.syncTombstones) ? mergedRecords.syncTombstones : {};
  applyTombstones(mergedRecords, tombstones);
  return {
    payload: { format: "life-maps-backup" as const, schemaVersion: 1, exportedAt: new Date().toISOString(),
      records: mergedRecords },
    conflicts,
  };
}
export function isPristineBackup(payload: BackupPayload): boolean {
  return Object.entries(payload.records).every(([key, value]) => {
    if (Array.isArray(value)) return value.length === 0;
    if (!isObject(value)) return value === null || value === undefined;
    if (key === "notificationSettings") return equal(value, { enabled: false });
    if (key === "vaccineStatuses") {
      const defaults = Object.fromEntries(VACCINES.map(vaccine => [vaccine.id, vaccine.status]));
      return equal(value, defaults);
    }
    return Object.keys(value).length === 0;
  });
}
export function backupsEqual(a: BackupPayload, b: BackupPayload): boolean {
  return equal(a.records, b.records);
}
