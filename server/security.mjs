import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_BYTES = 64;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function hashPassword(password, salt = randomBytes(16)) {
  const passwordHash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  return { salt, passwordHash: Buffer.from(passwordHash) };
}

export async function verifyPassword(password, salt, expectedHash) {
  const actual = await scrypt(password, salt, expectedHash.length, SCRYPT_OPTIONS);
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHash));
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseEncryptionKey(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("DATA_ENCRYPTION_KEY должен содержать 64 шестнадцатеричных символа (32 байта).");
  }
  return Buffer.from(value, "hex");
}

export function encryptPayload(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { payload, iv, authTag: cipher.getAuthTag() };
}

export function decryptPayload(encrypted, key) {
  const decipher = createDecipheriv("aes-256-gcm", key, encrypted.iv);
  decipher.setAuthTag(encrypted.auth_tag);
  const plaintext = Buffer.concat([decipher.update(encrypted.encrypted_payload), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}
