import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateBackupPayload } from "./backup-validation.mjs";

const valid = {
  format: "life-maps-backup",
  schemaVersion: 1,
  exportedAt: "2026-11-25T00:00:00.000Z",
  records: {
    lifeEvents: [{ id: "event-1", title: "Event" }],
    children: [{ id: "child-1", name: "Child" }],
    "childHealth:child-1:labUploads": {
      cbc: [{ id: "upload-1", blob: { __lifeMapsBlob: true, mimeType: "application/pdf", base64: "dGVzdA==" } }],
    },
  },
};

describe("server backup validation", () => {
  it("accepts a valid full backup with child records and encoded attachments", () => {
    assert.equal(validateBackupPayload(valid), true);
  });

  it("validates versioned deletion tombstones without medical payload data", () => {
    const records = {
      ...valid.records,
      syncTombstones: { lifeEvents: {
        "event-1": { version: 2, deletedAt: "2026-11-25T12:00:00.000Z" },
      } },
    };
    assert.equal(validateBackupPayload({ ...valid, records }), true);
    records.syncTombstones.lifeEvents["event-1"].version = 0;
    assert.equal(validateBackupPayload({ ...valid, records }), false);
  });

  it("rejects unknown keys and orphaned child records", () => {
    assert.equal(validateBackupPayload({ ...valid, records: { ...valid.records, credentials: {} } }), false);
    assert.equal(validateBackupPayload({ ...valid, records: { "childHealth:missing:healthEvents": [] } }), false);
  });

  it("accepts dated vaccination history in adult and child profiles", () => {
    const records = {
      ...valid.records,
      vaccineRecords: [{ id: "dose-1", vaccineId: "mmr", vaccineName: "MMR", date: "2026-04-12", dose: "1", facility: "Clinic", notes: "" }],
      "childHealth:child-1:vaccineRecords": [{ id: "child-dose-1", vaccineId: "dtp", vaccineName: "DTP", date: "2026-04-13", dose: "2", facility: "", notes: "" }],
    };
    assert.equal(validateBackupPayload({ ...valid, records }), true);
  });

  it("validates vaccination records and their attached certificates", () => {
    const records = {
      ...valid.records,
      vaccineRecords: [{
        id: "dose-1", vaccineId: "mmr", vaccineName: "MMR", date: "2026-04-12",
        dose: "1", facility: "", notes: "",
        documents: [{ id: "cert-1", name: "certificate.pdf", mimeType: "application/pdf",
          blob: { __lifeMapsBlob: true, mimeType: "application/pdf", base64: "dGVzdA==" } }],
      }],
    };
    assert.equal(validateBackupPayload({ ...valid, records }), true);
    records.vaccineRecords[0].date = "2026-02-30";
    assert.equal(validateBackupPayload({ ...valid, records }), false);
  });

  it("accepts multiple encoded documents on a single lab result", () => {
    const records = {
      ...valid.records,
      labResultEntries: [{
        id: "lab-1", testId: "cbc", testName: "CBC", date: "2026-11-20",
        indicators: [{ id: "hb", name: "Hemoglobin", value: 125, unit: "g/l" }],
        notes: "",
        documents: [
          { id: "doc-1", name: "first.pdf", mimeType: "application/pdf", blob: { __lifeMapsBlob: true, mimeType: "application/pdf", base64: "Zmlyc3Q=" } },
          { id: "doc-2", name: "second.pdf", mimeType: "application/pdf", blob: { __lifeMapsBlob: true, mimeType: "application/pdf", base64: "c2Vjb25k" } },
        ],
      }],
    };
    assert.equal(validateBackupPayload({ ...valid, records }), true);
    records.labResultEntries[0].documents[1].blob.base64 = "broken";
    assert.equal(validateBackupPayload({ ...valid, records }), false);
  });

  it("rejects malformed attachment encodings before storing the backup", () => {
    const malformed = structuredClone(valid);
    malformed.records["childHealth:child-1:labUploads"].cbc[0].blob.base64 = "not-base64";
    assert.equal(validateBackupPayload(malformed), false);
  });

  it("rejects invalid medical dates and duplicate record identifiers", () => {
    const badEvent = { ...valid, records: { healthEvents: [{ id: "event-1", date: "2026-02-30", title: "Осмотр" }] } };
    assert.equal(validateBackupPayload(badEvent), false);
    const duplicateChildren = { ...valid, records: { children: [{ id: "child-1" }, { id: "child-1" }] } };
    assert.equal(validateBackupPayload(duplicateChildren), false);
    const duplicateIndicators = { ...valid, records: { labResultEntries: [{
      id: "lab-1", testName: "ОАК", date: "2026-11-20",
      indicators: [{ id: "hb", name: "Hb", value: 120, unit: "г/л" }, { id: "hb", name: "Hb2", value: 121, unit: "г/л" }],
    }] } };
    assert.equal(validateBackupPayload(duplicateIndicators), false);
    const duplicateLabEntries = { ...valid, records: { labResultEntries: [
      { id: "same", testName: "ОАК", date: "2026-11-20", indicators: [{ id: "hb1", name: "Hb", value: 120, unit: "г/л" }] },
      { id: "same", testName: "ОАК", date: "2026-11-20", indicators: [{ id: "hb2", name: "Hb", value: 121, unit: "г/л" }] },
    ] } };
    assert.equal(validateBackupPayload(duplicateLabEntries), false);
  });

  it("rejects malformed medical measurements and excessive nesting", () => {
    const malformedDate = { ...valid, records: { ...valid.records, labMeasurements: { ferritin: [
      { id: "m1", date: "2026-02-30", value: "10", unit: "ng/ml" },
    ] } } };
    assert.equal(validateBackupPayload(malformedDate), false);
    let nested = {};
    let cursor = nested;
    for (let index = 0; index < 82; index += 1) cursor = cursor.next = {};
    assert.equal(validateBackupPayload({ ...valid, records: { notificationSettings: nested } }), false);
  });
});
