import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { AppDatabase } from "./db.mjs";
import { validateBackupPayload } from "./backup-validation.mjs";
import {
  createSessionToken, decryptPayload, encryptPayload, hashPassword, hashSessionToken,
  isValidEmail, normalizeEmail, parseEncryptionKey, verifyPassword,
} from "./security.mjs";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 105 * 1024 * 1024;
const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contentTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
  ".webp": "image/webp", ".woff2": "font/woff2",
};

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  response.end(JSON.stringify(payload));
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const separator = part.indexOf("=");
    return separator < 0 ? [part, ""] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Размер запроса превышает допустимые 105 МБ.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Некорректный JSON в запросе.");
    error.status = 400;
    throw error;
  }
}


function createRateLimiter() {
  const attempts = new Map();
  return (key, limit, windowMs) => {
    const now = Date.now();
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    current.count += 1;
    return current.count > limit;
  };
}

function cookieName(secure) {
  return secure ? "__Host-life_maps_session" : "life_maps_session";
}

function sessionCookie(token, secure) {
  return `${cookieName(secure)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(secure) {
  return `${cookieName(secure)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

function serveStatic(request, response) {
  const distRoot = resolve(projectRoot, "dist");
  if (!existsSync(distRoot)) {
    sendJson(response, 503, { error: "Frontend build is unavailable." });
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid URL." });
    return;
  }
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  let filename = resolve(distRoot, requested);
  if (filename !== distRoot && !filename.startsWith(distRoot + sep)) {
    sendJson(response, 400, { error: "Invalid path." });
    return;
  }
  if (!existsSync(filename) || !statSync(filename).isFile()) filename = resolve(distRoot, "index.html");
  if (!existsSync(filename)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filename)] ?? "application/octet-stream",
    "Cache-Control": filename.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  createReadStream(filename).pipe(response);
}

export function createAppServer({
  databasePath = process.env.DATABASE_PATH ?? "./data/life-maps.sqlite",
  encryptionKey = parseEncryptionKey(process.env.DATA_ENCRYPTION_KEY),
  secureCookies = process.env.NODE_ENV === "production",
} = {}) {
  const database = new AppDatabase(databasePath);
  const rateLimited = createRateLimiter();

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const method = request.method ?? "GET";
    const ip = request.socket.remoteAddress ?? "unknown";
    const authRoute = url.pathname.startsWith("/api/auth/");
    try {
      if (method !== "GET" && method !== "HEAD" && url.pathname.startsWith("/api/")) {
        const origin = request.headers.origin;
        if (origin && new URL(origin).host !== request.headers.host) {
          sendJson(response, 403, { error: "Запрос с другого источника запрещён." });
          return;
        }
      }

      if (method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      const cookies = parseCookies(request.headers.cookie);
      const token = cookies[cookieName(secureCookies)];
      const tokenHash = token ? hashSessionToken(token) : null;
      const user = tokenHash ? database.getSessionUser(tokenHash) : null;

      if (authRoute && (method === "POST") && rateLimited(`${ip}:${url.pathname}`, url.pathname.endsWith("/register") ? 5 : 10, 15 * 60 * 1000)) {
        sendJson(response, 429, { error: "Слишком много попыток. Повторите позже." }, { "Retry-After": "900" });
        return;
      }

      if (method === "POST" && url.pathname === "/api/auth/register") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const password = body?.password;
        if (!isValidEmail(email)) {
          sendJson(response, 400, { error: "Укажите корректный адрес электронной почты." });
          return;
        }
        if (typeof password !== "string" || password.length < 12 || password.length > 256) {
          sendJson(response, 400, { error: "Пароль должен содержать от 12 до 256 символов." });
          return;
        }
        const credentials = await hashPassword(password);
        const account = { id: randomUUID(), email, salt: credentials.salt, passwordHash: credentials.passwordHash, createdAt: new Date().toISOString() };
        try {
          database.createUser(account);
        } catch (error) {
          // SQLite driver error codes differ between Node releases. Confirm the
          // unique-email condition from the database instead of matching a code.
          if (database.getUserByEmail(email)) {
            sendJson(response, 409, { error: "Аккаунт с таким адресом уже существует." });
            return;
          }
          throw error;
        }
        const sessionToken = createSessionToken();
        database.createSession(hashSessionToken(sessionToken), account.id, Date.now() + SESSION_TTL_MS, new Date().toISOString());
        database.deleteExpiredSessions();
        sendJson(response, 201, { user: { id: account.id, email, createdAt: account.createdAt } }, { "Set-Cookie": sessionCookie(sessionToken, secureCookies) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/auth/login") {
        const body = await readJson(request);
        const email = normalizeEmail(body?.email);
        const password = body?.password;
        const account = isValidEmail(email) && typeof password === "string" ? database.getUserByEmail(email) : null;
        const valid = account ? await verifyPassword(password, account.password_salt, account.password_hash) : false;
        if (!valid || !account) {
          sendJson(response, 401, { error: "Неверный адрес электронной почты или пароль." });
          return;
        }
        const sessionToken = createSessionToken();
        database.createSession(hashSessionToken(sessionToken), account.id, Date.now() + SESSION_TTL_MS, new Date().toISOString());
        database.deleteExpiredSessions();
        sendJson(response, 200, { user: { id: account.id, email: account.email, createdAt: account.created_at } }, { "Set-Cookie": sessionCookie(sessionToken, secureCookies) });
        return;
      }

      if (method === "POST" && url.pathname === "/api/auth/logout") {
        if (tokenHash) database.deleteSession(tokenHash);
        sendJson(response, 200, { ok: true }, { "Set-Cookie": clearSessionCookie(secureCookies) });
        return;
      }

      if (method === "GET" && url.pathname === "/api/auth/me") {
        sendJson(response, 200, { user: user ? { id: user.id, email: user.email, createdAt: user.created_at } : null });
        return;
      }

      if (method === "GET" && url.pathname === "/api/sync/changes") {
        if (!user) {
          sendJson(response, 401, { error: "Требуется вход в аккаунт." });
          return;
        }
        const after = Number(url.searchParams.get("after") ?? 0);
        if (!Number.isSafeInteger(after) || after < 0) {
          sendJson(response, 400, { error: "Некорректная ревизия журнала." });
          return;
        }
        sendJson(response, 200, { changes: database.listChanges(user.id, after, 100) });
        return;
      }

      if (method === "GET" && url.pathname === "/api/sync/status") {
        if (!user) {
          sendJson(response, 401, { error: "Требуется вход в аккаунт." });
          return;
        }
        const metadata = database.getBackupMetadata(user.id);
        sendJson(response, 200, {
          revision: metadata?.revision ?? null,
          updatedAt: metadata?.updated_at ?? null,
        });
        return;
      }

      if (url.pathname === "/api/data" && (method === "GET" || method === "PUT")) {
        if (!user) {
          sendJson(response, 401, { error: "Требуется вход в аккаунт." });
          return;
        }
        if (method === "GET") {
          const stored = database.getBackup(user.id);
          if (!stored) {
            sendJson(response, 200, { payload: null, revision: null, updatedAt: null });
            return;
          }
          const payload = decryptPayload(stored, encryptionKey);
          sendJson(response, 200, { payload, revision: stored.revision, updatedAt: stored.updated_at }, { ETag: `"${stored.revision}"` });
          return;
        }
        const body = await readJson(request);
        if (!validateBackupPayload(body?.payload)) {
          sendJson(response, 400, { error: "Формат резервной копии не поддерживается." });
          return;
        }
        if (typeof body.operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.operationId)) {
          sendJson(response, 400, { error: "Для синхронизации требуется корректный идентификатор операции." });
          return;
        }
        if (body.expectedRevision !== null && (!Number.isInteger(body.expectedRevision) || body.expectedRevision < 1)) {
          sendJson(response, 400, { error: "Некорректная версия данных." });
          return;
        }
        const serializedPayload = JSON.stringify(body.payload.records);
        const requestHash = createHash("sha256").update(serializedPayload).digest("hex");
        const encrypted = encryptPayload(body.payload, encryptionKey);
        const recordCount = Object.values(body.payload.records).reduce((total, value) => total + (Array.isArray(value) ? value.length : 1), 0);
        const saved = database.saveBackup(user.id, encrypted, body.expectedRevision, new Date().toISOString(),
          body.operationId, requestHash, recordCount);
        if (saved.conflict) {
          sendJson(response, 409, { error: saved.reason === "operation-id-reused"
            ? "Идентификатор операции уже использован для другого содержимого."
            : "Данные аккаунта изменились на другом устройстве. Сначала загрузите актуальную версию.", revision: saved.currentRevision });
          return;
        }
        sendJson(response, 200, { revision: saved.revision, duplicate: saved.duplicate });
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        sendJson(response, 404, { error: "API endpoint not found." });
        return;
      }
      if (method === "GET" || method === "HEAD") {
        serveStatic(request, response);
        return;
      }
      sendJson(response, 405, { error: "Method not allowed." });
    } catch (error) {
      sendJson(response, error.status ?? 500, { error: error.status ? error.message : "Внутренняя ошибка сервера." });
    }
  });

  server.on("close", () => database.close());
  return server;
}
