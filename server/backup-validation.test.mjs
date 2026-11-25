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

  it("rejects malformed attachment encodings before storing the backup", () => {
    const malformed = structuredClone(valid);
    malformed.records["childHealth:child-1:labUploads"].cbc[0].blob.base64 = "not-base64";
    assert.equal(validateBackupPayload(malformed), false);
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
