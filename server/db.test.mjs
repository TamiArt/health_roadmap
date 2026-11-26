import { afterEach, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppDatabase } from "./db.mjs";

const directories = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

it("persists account, session and encrypted backup metadata across database restarts", () => {
  const directory = mkdtempSync(join(tmpdir(), "life-maps-db-"));
  directories.push(directory);
  const filename = join(directory, "life-maps.sqlite");
  const first = new AppDatabase(filename);
  first.createUser({
    id: "user-1", email: "owner@example.com", salt: Buffer.alloc(16, 1),
    passwordHash: Buffer.alloc(64, 2), createdAt: "2026-11-26T00:00:00.000Z",
  });
  first.createSession("session-hash", "user-1", Date.now() + 60_000, "2026-11-26T00:00:00.000Z");
  const saved = first.saveBackup("user-1", {
    payload: Buffer.from("encrypted-payload"),
    iv: Buffer.alloc(12, 3),
    authTag: Buffer.alloc(16, 4),
  }, null, "2026-11-26T00:01:00.000Z", "operation-1", "a".repeat(64), 3, ["labResultEntries"]);
  assert.deepEqual(saved, { conflict: false, duplicate: false, revision: 1 });
  assert.equal(first.healthCheck(), true);
  first.close();

  const reopened = new AppDatabase(filename);
  try {
    assert.equal(reopened.getUserByEmail("owner@example.com").id, "user-1");
    assert.equal(reopened.getSessionUser("session-hash").email, "owner@example.com");
    const persistedBackup = reopened.getBackup("user-1");
    assert.equal(persistedBackup.revision, 1);
    assert.equal(persistedBackup.encrypted_payload.toString(), "encrypted-payload");
    assert.equal(reopened.healthCheck(), true);
  } finally {
    reopened.close();
  }
});
