import { it } from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken, decryptPayload, encryptPayload, hashPassword,
  hashSessionToken, parseEncryptionKey, verifyPassword,
} from "./security.mjs";

it("requires a full 256-bit encryption key and rejects malformed secrets", () => {
  assert.throws(() => parseEncryptionKey("too-short"), /64.*(?:hexadecimal|шестнадцатеричных)/i);
  assert.throws(() => parseEncryptionKey("g".repeat(64)), /64.*(?:hexadecimal|шестнадцатеричных)/i);
  assert.equal(parseEncryptionKey("ab".repeat(32)).length, 32);
});

it("authenticates encrypted database payloads and detects tampering", () => {
  const key = parseEncryptionKey("12".repeat(32));
  const encrypted = encryptPayload({ records: { private: "medical data" } }, key);
  assert.deepEqual(decryptPayload({
    encrypted_payload: encrypted.payload,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
  }, key), { records: { private: "medical data" } });
  assert.throws(() => decryptPayload({
    encrypted_payload: encrypted.payload,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
  }, parseEncryptionKey("34".repeat(32))));
});

it("uses salted password hashes and stores only a hash of a random session token", async () => {
  const first = await hashPassword("a-long-test-password");
  const second = await hashPassword("a-long-test-password");
  assert.notDeepEqual(first.salt, second.salt);
  assert.notDeepEqual(first.passwordHash, second.passwordHash);
  assert.equal(await verifyPassword("a-long-test-password", first.salt, first.passwordHash), true);
  assert.equal(await verifyPassword("incorrect-password", first.salt, first.passwordHash), false);

  const token = createSessionToken();
  assert.equal(Buffer.from(token, "base64url").length, 32);
  assert.notEqual(hashSessionToken(token), token);
  assert.equal(hashSessionToken(token).length, 64);
});
