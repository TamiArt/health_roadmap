import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "./app.mjs";

const encryptionKey = "4f".repeat(32);
const backup = {
  format: "life-maps-backup",
  schemaVersion: 1,
  exportedAt: "2026-11-25T00:00:00.000Z",
  records: {
    lifeEvents: [{ id: "event-1", title: "Private event" }],
    children: [{ id: "child-1", name: "Child" }],
    "childHealth:child-1:labMeasurements": { ferritin: [{ id: "measurement-1", date: "2026-11-25", value: "12.1", unit: "г/л" }] },
  },
};

let server;
let baseUrl;

before(async () => {
  server = createAppServer({ databasePath: ":memory:", encryptionKey: Buffer.from(encryptionKey, "hex"), secureCookies: false });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function request(path, options = {}) {
  return fetch(baseUrl + path, options);
}

function cookieFrom(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "session cookie should be set");
  return value.split(";")[0];
}

describe("self-hosted account API", () => {
  it("registers an account, normalizes email and creates an HttpOnly session", async () => {
    const response = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  OWNER@Example.com ", password: "a-secure-password-123" }),
    });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).user.email, "owner@example.com");
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(response.headers.get("set-cookie"), /SameSite=Strict/);
  });

  it("rejects duplicate accounts and weak passwords", async () => {
    const duplicate = await request("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    assert.equal(duplicate.status, 409);

    const weak = await request("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "weak@example.com", password: "short" }),
    });
    assert.equal(weak.status, 400);
  });

  it("requires authentication and keeps backup data isolated by account", async () => {
    const unauthorized = await request("/api/data");
    assert.equal(unauthorized.status, 401);
    const unauthorizedSyncStatus = await request("/api/sync/status");
    assert.equal(unauthorizedSyncStatus.status, 401);

    const ownerLogin = await request("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    assert.equal(ownerLogin.status, 200);
    const ownerCookie = cookieFrom(ownerLogin);

    const create = await request("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ payload: backup, expectedRevision: null, operationId: "00000000-0000-4000-8000-000000000001" }),
    });
    assert.equal(create.status, 200);
    assert.equal((await create.json()).revision, 1);
    const syncStatus = await request("/api/sync/status", { headers: { Cookie: ownerCookie } });
    assert.equal(syncStatus.status, 200);
    assert.equal((await syncStatus.json()).revision, 1);

    const ownerData = await request("/api/data", { headers: { Cookie: ownerCookie } });
    const ownerPayload = await ownerData.json();
    assert.equal(ownerPayload.payload.records.lifeEvents[0].title, "Private event");
    assert.equal(ownerPayload.payload.records["childHealth:child-1:labMeasurements"].ferritin[0].value, "12.1");

    const secondRegistration = await request("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "second@example.com", password: "another-secure-password" }),
    });
    const secondCookie = cookieFrom(secondRegistration);
    const secondData = await request("/api/data", { headers: { Cookie: secondCookie } });
    assert.equal((await secondData.json()).payload, null);
    const secondSyncStatus = await request("/api/sync/status", { headers: { Cookie: secondCookie } });
    assert.deepEqual(await secondSyncStatus.json(), { revision: null, updatedAt: null });
  });

  it("rejects stale writes rather than silently overwriting another device's data", async () => {
    const login = await request("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    const cookie = cookieFrom(login);
    const update = await request("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ payload: { ...backup, exportedAt: "2026-11-26T00:00:00.000Z" }, expectedRevision: 1, operationId: "00000000-0000-4000-8000-000000000002" }),
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).revision, 2);

    const stale = await request("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ payload: backup, expectedRevision: 1, operationId: "00000000-0000-4000-8000-000000000003" }),
    });
    assert.equal(stale.status, 409);
  });

  it("rejects invalid backups without changing the stored revision", async () => {
    const login = await request("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    const cookie = cookieFrom(login);
    const invalid = await request("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ payload: { ...backup, records: { ...backup.records, credentials: { token: "invalid" } } }, expectedRevision: 2, operationId: "00000000-0000-4000-8000-000000000004" }),
    });
    assert.equal(invalid.status, 400);
    const current = await request("/api/data", { headers: { Cookie: cookie } });
    const data = await current.json();
    assert.equal(data.revision, 2);
    assert.equal(data.payload.records.lifeEvents[0].title, "Private event");
  });

  it("rejects cross-origin state-changing requests", async () => {
    const response = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    assert.equal(response.status, 403);
  });

  it("logs out and invalidates the server-side session", async () => {
    const login = await request("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "a-secure-password-123" }),
    });
    const cookie = cookieFrom(login);
    const logout = await request("/api/auth/logout", { method: "POST", headers: { Cookie: cookie } });
    assert.equal(logout.status, 200);
    const me = await request("/api/auth/me", { headers: { Cookie: cookie } });
    assert.equal((await me.json()).user, null);
  });
});
