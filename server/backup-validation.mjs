const ALLOWED_KEYS = new Set([
  "lifeEvents", "familyMembers", "children", "familyEvents", "vaccineStatuses", "vaccineRecords",
  "adultToothData", "labUploads", "labMeasurements", "healthEvents",
  "healthMonitoring", "labResultEntries", "syncTombstones", "notificationSettings",
]);
const CHILD_KEY = /^childHealth:([a-zA-Z0-9_-]+):(vaccineStatuses|vaccineRecords|toothData|labUploads|labMeasurements|healthEvents|healthMonitoring|labResultEntries)$/;
const ARRAY_KEYS = new Set(["lifeEvents", "familyMembers", "children", "familyEvents", "healthEvents", "healthMonitoring", "vaccineRecords"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueIds(items) {
  const ids = items.map(item => isRecord(item) ? item.id : undefined);
  return ids.every(id => typeof id === "string" && id.trim().length > 0) && new Set(ids).size === ids.length;
}

function validDate(value) {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const date = new Date(value + "T00:00:00");
  return !Number.isNaN(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
}

function isEncodedBlob(value) {
  return isRecord(value) && value.__lifeMapsBlob === true && typeof value.mimeType === "string" &&
    typeof value.base64 === "string" && value.base64.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64) &&
    Buffer.from(value.base64, "base64").toString("base64") === value.base64;
}

function validateEncodedValues(value, depth = 0) {
  if (depth > 80) return false;
  if (Array.isArray(value)) return value.every(item => validateEncodedValues(item, depth + 1));
  if (!isRecord(value)) return true;
  if (Object.hasOwn(value, "__lifeMapsBlob")) return isEncodedBlob(value);
  return Object.entries(value).every(([key, item]) =>
    key !== "__proto__" && key !== "constructor" && key !== "prototype" &&
    validateEncodedValues(item, depth + 1));
}

function validateRecord(key, value) {
  const baseKey = key.startsWith("childHealth:") ? key.slice(key.lastIndexOf(":") + 1) : key;
  if (ARRAY_KEYS.has(baseKey)) {
    if (!Array.isArray(value) || !uniqueIds(value)) return false;
    if (baseKey === "healthEvents" && value.some(item => !validDate(item.date))) return false;
    if (baseKey === "vaccineRecords") {
      return value.every(record => {
        if (typeof record.vaccineId !== "string" || typeof record.vaccineName !== "string" ||
            !validDate(record.date) || typeof record.dose !== "string" ||
            typeof record.facility !== "string" || typeof record.notes !== "string") return false;
        if (record.documents === undefined) return true;
        return Array.isArray(record.documents) && uniqueIds(record.documents) && record.documents.every(document =>
          isRecord(document) && typeof document.id === "string" && typeof document.name === "string" &&
          typeof document.mimeType === "string" && isEncodedBlob(document.blob));
      });
    }
    if (baseKey === "healthMonitoring") return value.every(item => {
      const reminder = item.reminder;
      const readings = item.measurements ?? [];
      (item.nextDueDate === undefined || item.nextDueDate === "" || validDate(item.nextDueDate)) &&
        (item.lastCheckedDate === undefined || item.lastCheckedDate === "" || validDate(item.lastCheckedDate)) &&
        (reminder === undefined || (isRecord(reminder) && typeof reminder.enabled === "boolean" &&
          Number.isInteger(reminder.leadDays) && reminder.leadDays >= 0 && reminder.leadDays <= 365 &&
          typeof reminder.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time))) &&
        Array.isArray(readings) && uniqueIds(readings) && readings.every(reading => isRecord(reading) &&
          validDate(reading.date) && typeof reading.value === "number" && Number.isFinite(reading.value) &&
          typeof reading.unit === "string");
    });
    return true;
  }
  if (baseKey === "labResultEntries") {
    return Array.isArray(value) && uniqueIds(value) && value.every(entry => {
      if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim() || typeof entry.testName !== "string" ||
          !validDate(entry.date) || !Array.isArray(entry.indicators) || entry.indicators.length === 0 || !uniqueIds(entry.indicators)) return false;
      if (!entry.indicators.every(item => isRecord(item) && typeof item.id === "string" &&
          typeof item.name === "string" && typeof item.value === "number" &&
          Number.isFinite(item.value) && typeof item.unit === "string")) return false;
      const validDocument = (document, requireMimeType = true) => isRecord(document) &&
        typeof document.id === "string" && typeof document.name === "string" &&
        (typeof document.mimeType === "string" || (!requireMimeType && document.mimeType === undefined)) &&
        isEncodedBlob(document.blob);
      if (entry.document !== undefined && !validDocument(entry.document, false)) return false;
      if (entry.documents !== undefined &&
          (!Array.isArray(entry.documents) || !entry.documents.every(document => validDocument(document)))) return false;
      const documentIds = [...(entry.documents ?? []), ...(entry.document ? [entry.document] : [])];
      if (!uniqueIds(documentIds)) return false;
      return true;
    });
  }
  if (!isRecord(value)) return false;
  if (baseKey === "syncTombstones") return Object.entries(value).every(([path, entries]) =>
    typeof path === "string" && path.length <= 256 && isRecord(entries) &&
    Object.entries(entries).every(([id, tombstone]) => typeof id === "string" && id.length > 0 &&
      isRecord(tombstone) && Number.isSafeInteger(tombstone.version) && tombstone.version >= 1 &&
      typeof tombstone.deletedAt === "string" && !Number.isNaN(Date.parse(tombstone.deletedAt))));
  if (baseKey === "labMeasurements") return Object.values(value).every(items =>
    Array.isArray(items) && uniqueIds(items) && items.every(item => isRecord(item) &&
      typeof item.value === "string" && typeof item.unit === "string" && validDate(item.date)));
  if (baseKey === "labUploads") return Object.values(value).every(items =>
    Array.isArray(items) && uniqueIds(items) && items.every(item => isRecord(item) && isEncodedBlob(item.blob)));
  return true;
}

export function validateBackupPayload(payload) {
  if (!isRecord(payload) || payload.format !== "life-maps-backup" ||
      payload.schemaVersion !== 1 || !isRecord(payload.records)) return false;
  const entries = Object.entries(payload.records);
  if (!entries.every(([key, value]) =>
    (ALLOWED_KEYS.has(key) || CHILD_KEY.test(key)) && validateRecord(key, value) &&
    validateEncodedValues(value))) return false;

  const children = payload.records.children;
  const childList = Array.isArray(children) ? children : [];
  if (childList.length && (!uniqueIds(childList) || childList.some(item =>
    !isRecord(item) || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(item.id)))) return false;
  const childIds = new Set(childList.map(item => item.id));
  return entries.every(([key]) => {
    const match = CHILD_KEY.exec(key);
    return !match || childIds.has(match[1]);
  });
}
