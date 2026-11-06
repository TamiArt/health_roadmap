import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const DB_NAME = "life-maps";
const DB_VERSION = 1;
const STORE_NAME = "app-records";
export const BACKUP_FORMAT = "life-maps-backup";
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const RESTORE_EVENT = "life-maps:backup-restored";

type StoredRecord = { key: string; value: unknown };
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
]);

export function isAllowedRecordKey(key: string): boolean {
  return ALLOWED_KEYS.has(key) || /^childHealth:[a-zA-Z0-9_-]+:(vaccineStatuses|toothData|labUploads)$/.test(key);
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error("Не удалось открыть локальную базу данных."));
    };
    request.onblocked = () => reject(new Error("Обновление локальной базы заблокировано другой вкладкой."));
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Ошибка операции с локальной базой."));
  });
}

export async function readRecord<T>(key: string): Promise<T | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestResult<StoredRecord | undefined>(transaction.objectStore(STORE_NAME).get(key));
  return record?.value as T | undefined;
}

export async function writeRecord<T>(key: string, value: T): Promise<void> {
  if (!isAllowedRecordKey(key)) throw new Error("Недопустимый ключ пользовательских данных.");
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({ key, value } satisfies StoredRecord);
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Не удалось сохранить данные."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Сохранение отменено."));
  });
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
  if (key === "labUploads") {
    for (const [testId, uploads] of Object.entries(value)) {
      if (!Array.isArray(uploads) || uploads.some(item =>
        !isPlainRecord(item) || typeof item.id !== "string" || !(item.blob instanceof Blob)
      )) {
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
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export async function importBackup(file: File): Promise<void> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Размер резервной копии превышает 50 МБ.");
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
): [T, Dispatch<SetStateAction<T>>, boolean, string | null] {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await readRecord<T>(key);
        if (active && saved !== undefined) setValue(saved);
        if (active) setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Не удалось загрузить локальные данные.");
      } finally {
        if (active) setReady(true);
      }
    };
    void load();

    const reload = () => {
      setReady(false);
      void load();
    };
    window.addEventListener(RESTORE_EVENT, reload);
    return () => {
      active = false;
      window.removeEventListener(RESTORE_EVENT, reload);
    };
  }, [key]);

  useEffect(() => {
    if (!ready || error) return;
    void writeRecord(key, value).catch(cause => {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить локальные данные.");
    });
  }, [key, value, ready, error]);

  return [value, setValue, ready, error];
}
