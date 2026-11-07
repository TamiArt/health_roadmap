import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const DB_NAME = "life-maps";
const DB_VERSION = 1;
const STORE_NAME = "app-records";
export const BACKUP_FORMAT = "life-maps-backup";
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const RESTORE_EVENT = "life-maps:backup-restored";

type StoredRecord = { key: string; value: unknown; revision?: number };
type VersionedRecord<T> = { value: T | undefined; revision: number };
export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  records: Record<string, unknown>;
};

const ALLOWED_KEYS = new Set([
  "lifeEvents",
  "familyMembers",
  "children",
  "familyEvents",
  "vaccineStatuses",
  "adultToothData",
  "labUploads",
  "labMeasurements",
]);

export function isAllowedRecordKey(key: string): boolean {
  return ALLOWED_KEYS.has(key) || /^childHealth:[a-zA-Z0-9_-]+:(vaccineStatuses|toothData|labUploads|labMeasurements)$/.test(key);
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Локальная база данных недоступна в этом браузере."));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        // Release this tab's connection so another tab can upgrade the schema.
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error("Не удалось открыть локальную базу данных."));
    };
    // "blocked" is a waiting state, not a terminal error. Keep the request
    // pending; an older tab may close its connection and let this open succeed.
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Ошибка операции с локальной базой."));
  });
}

export async function readRecordState<T>(key: string): Promise<VersionedRecord<T>> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestResult<StoredRecord | undefined>(transaction.objectStore(STORE_NAME).get(key));
  return { value: record?.value as T | undefined, revision: record?.revision ?? 0 };
}

export async function readRecord<T>(key: string): Promise<T | undefined> {
  return (await readRecordState<T>(key)).value;
}

/** Compare-and-write: a stale tab cannot overwrite a newer IndexedDB revision. */
export async function writeRecord<T>(key: string, value: T, expectedRevision?: number): Promise<VersionedRecord<T> & { conflict: boolean }> {
  if (!isAllowedRecordKey(key)) throw new Error("Недопустимый ключ пользовательских данных.");
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  let result: VersionedRecord<T> & { conflict: boolean } = { value, revision: 0, conflict: false };
  const request = store.get(key);
  request.onsuccess = () => {
    const current = request.result as StoredRecord | undefined;
    const currentRevision = current?.revision ?? 0;
    if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
      result = { value: current?.value as T | undefined, revision: currentRevision, conflict: true };
      return;
    }
    result = { value, revision: currentRevision + 1, conflict: false };
    store.put({ key, value, revision: result.revision } satisfies StoredRecord);
  };
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Не удалось сохранить данные."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Сохранение отменено."));
  });
  if (!result.conflict && typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("life-maps:records");
    channel.postMessage({ key, value, revision: result.revision });
    channel.close();
  }
  return result;
}

async function readAllRecords(): Promise<Record<string, unknown>> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const records = await requestResult<StoredRecord[]>(transaction.objectStore(STORE_NAME).getAll());
  return Object.fromEntries(records.map(record => [record.key, record.value]));
}

type EncodedBlob = { __lifeMapsBlob: true; mimeType: string; base64: string };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function encodeBackupValue(value: unknown): Promise<unknown> {
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return {
      __lifeMapsBlob: true,
      mimeType: value.type,
      base64: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
    } satisfies EncodedBlob;
  }
  if (Array.isArray(value)) return Promise.all(value.map(encodeBackupValue));
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await encodeBackupValue(item)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

export async function decodeBackupValue(value: unknown): Promise<unknown> {
  if (value && typeof value === "object" && !Array.isArray(value) && "__lifeMapsBlob" in value) {
    const encoded = value as EncodedBlob;
    if (encoded.__lifeMapsBlob !== true || typeof encoded.base64 !== "string" || typeof encoded.mimeType !== "string") {
      throw new Error("Некорректное вложение в резервной копии.");
    }
    const bytes = base64ToBytes(encoded.base64);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new Blob([copy.buffer], { type: encoded.mimeType });
  }
  if (Array.isArray(value)) return Promise.all(value.map(decodeBackupValue));
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await decodeBackupValue(item)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateRecordValue(key: string, value: unknown): void {
  const arrayKeys = new Set(["lifeEvents", "familyMembers", "children", "familyEvents"]);
  if (arrayKeys.has(key)) {
    if (!Array.isArray(value)) throw new Error(`Повреждён список данных: ${key}`);
    if (value.some(item => !isPlainRecord(item) || typeof item.id !== "string")) {
      throw new Error(`В списке ${key} обнаружена некорректная запись.`);
    }
    return;
  }

  if (!isPlainRecord(value)) throw new Error(`Повреждена запись данных: ${key}`);
  if (key === "labMeasurements" || key.endsWith(":labMeasurements")) {
    for (const [testId, measurements] of Object.entries(value)) {
      if (!Array.isArray(measurements) || measurements.some(item => {
        if (!isPlainRecord(item) || typeof item.id !== "string" || typeof item.value !== "string" ||
            typeof item.unit !== "string" || typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return true;
        const date = new Date(item.date + "T00:00:00");
        return Number.isNaN(date.getTime()) || date.getFullYear() !== Number(item.date.slice(0,4)) ||
          date.getMonth()+1 !== Number(item.date.slice(5,7)) || date.getDate() !== Number(item.date.slice(8,10));
      })) throw new Error(`Повреждены значения анализов для исследования ${testId}.`);
    }
  }

  if (key === "labUploads" || key.endsWith(":labUploads")) {
    for (const [testId, uploads] of Object.entries(value)) {
      if (!Array.isArray(uploads) || uploads.some(item => {
        if (!isPlainRecord(item) || typeof item.id !== "string" || !isPlainRecord(item.blob)) return true;
        const blob = item.blob;
        const isStoredBlob = typeof Blob !== "undefined" && blob instanceof Blob;
        const isBackupBlob = blob.__lifeMapsBlob === true && typeof blob.base64 === "string" && typeof blob.mimeType === "string";
        return !isStoredBlob && !isBackupBlob;
      })) {
        throw new Error(`Повреждены вложения для исследования ${testId}.`);
      }
    }
  }
}

export function migrateBackup(input: BackupPayload): BackupPayload {
  if (input.format !== BACKUP_FORMAT) throw new Error("Файл не является резервной копией Life Maps.");
  if (!Number.isInteger(input.schemaVersion) || input.schemaVersion < 0 || input.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error("Версия резервной копии не поддерживается.");
  }
  if (!input.records || typeof input.records !== "object" || Array.isArray(input.records)) {
    throw new Error("Структура резервной копии повреждена.");
  }

  let records = { ...input.records };
  let version = input.schemaVersion;

  // Migration 0 -> 1: mark the first supported backup schema; preserve all records.
  if (version === 0) {
    // Keep every record during migration; validation below rejects unknown keys.
    version = 1;
  }

  for (const [key, value] of Object.entries(records)) {
    if (!isAllowedRecordKey(key)) throw new Error(`Неизвестный тип данных в резервной копии: ${key}`);
    validateRecordValue(key, value);
  }

  return {
    format: BACKUP_FORMAT,
    schemaVersion: version,
    exportedAt: input.exportedAt || new Date().toISOString(),
    records,
  };
}

export async function exportBackup(): Promise<Blob> {
  const records = await readAllRecords();
  const encodedRecords = await encodeBackupValue(records) as Record<string, unknown>;
  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    records: encodedRecords,
  };
  const backup = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  if (backup.size > MAX_BACKUP_BYTES) throw new Error("Резервная копия превышает максимальный размер 100 МБ.");
  return backup;
}

export async function importBackup(file: File): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Размер резервной копии превышает 100 МБ.");
  const raw: unknown = JSON.parse(await file.text());
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Некорректный файл резервной копии.");

  const migrated = migrateBackup(raw as BackupPayload);
  const decodedRecords = await decodeBackupValue(migrated.records) as Record<string, unknown>;
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.clear();
  for (const [key, value] of Object.entries(decodedRecords)) store.put({ key, value } satisfies StoredRecord);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Не удалось восстановить резервную копию."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Восстановление отменено."));
  });
  window.dispatchEvent(new Event(RESTORE_EVENT));
}

export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean, string | null, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const skipNextWrite = useRef<{ value: T } | null>(null);
  const revision = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const updateGeneration = useRef(0);

  useEffect(() => {
    let active = true;
    updateGeneration.current += 1;
    revision.current = 0;
    skipNextWrite.current = null;
    const load = async () => {
      // Invalidate pending writes before initial load or backup restoration.
      updateGeneration.current += 1;
      skipNextWrite.current = null;
      try {
        const saved = await readRecordState<T>(key);
        if (active) {
          revision.current = saved.revision;
          // Loading an existing record is not a user edit. Do not write the
          // loaded snapshot back: that would create a needless revision and
          // can make another tab's otherwise-current revision look stale.
          const loadedValue = saved.value !== undefined ? saved.value : initialValue;
          skipNextWrite.current = { value: loadedValue };
          setValue(loadedValue);
          setLoadedKey(key);
        }
        if (active) setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить локальные данные.");
      } finally {
        if (active) setReady(true);
      }
    };
    void load();

    // Keep the application mounted while refreshing records after restore.
    // Setting ready=false here unmounts the hook owner; its cleanup then
    // prevents this async load from ever setting ready=true again.
    const reload = () => {
      void load();
    };
    window.addEventListener(RESTORE_EVENT, reload);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("life-maps:records") : undefined;
    if (channel) {
      channel.onmessage = event => {
        const message = event.data as { key?: unknown; value?: unknown; revision?: unknown };
        if (message?.key !== key || typeof message.revision !== "number" || message.revision <= revision.current) return;
        // Ignore stale/out-of-order notifications; apply only a newer committed revision.
        revision.current = message.revision;
        updateGeneration.current += 1;
        const incomingValue = message.value as T;
        skipNextWrite.current = { value: incomingValue };
        setValue(incomingValue);
      };
    }
    return () => {
      active = false;
      window.removeEventListener(RESTORE_EVENT, reload);
      channel?.close();
    };
  }, [key]);

  useEffect(() => {
    if (!ready || error || loadedKey !== key) return;
    if (skipNextWrite.current) {
      const remoteUpdate = skipNextWrite.current;
      skipNextWrite.current = null;
      if (remoteUpdate.value === value) return;
    }
    const generation = updateGeneration.current;
    writeQueue.current = writeQueue.current.then(async () => {
      // Ignore queued writes made obsolete by a remote update or key change.
      if (generation !== updateGeneration.current) return;
      const result = await writeRecord(key, value, revision.current);
      revision.current = result.revision;
      if (result.conflict) {
        setConflict(true);
        updateGeneration.current += 1;
        const winningValue = result.value as T;
        skipNextWrite.current = { value: winningValue };
        setValue(winningValue);
      } else {
        setConflict(false);
      }
    }).catch(cause => {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить локальные данные.");
    });
  }, [key, value, ready, loadedKey, error]);

  return [value, setValue, ready, error, conflict];
}
