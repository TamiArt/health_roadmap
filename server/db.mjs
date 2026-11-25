import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class AppDatabase {
  constructor(filename) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_salt BLOB NOT NULL,
        password_hash BLOB NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE TABLE IF NOT EXISTS user_backups (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        encrypted_payload BLOB NOT NULL,
        iv BLOB NOT NULL,
        auth_tag BLOB NOT NULL,
        revision INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.statements = {
      createUser: this.database.prepare("INSERT INTO users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"),
      userByEmail: this.database.prepare("SELECT id, email, password_salt, password_hash, created_at FROM users WHERE email = ?"),
      userById: this.database.prepare("SELECT id, email, created_at FROM users WHERE id = ?"),
      createSession: this.database.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"),
      sessionUser: this.database.prepare("SELECT users.id, users.email, users.created_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"),
      deleteSession: this.database.prepare("DELETE FROM sessions WHERE token_hash = ?"),
      deleteExpiredSessions: this.database.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
      backupByUser: this.database.prepare("SELECT encrypted_payload, iv, auth_tag, revision, updated_at FROM user_backups WHERE user_id = ?"),
      insertBackup: this.database.prepare("INSERT INTO user_backups (user_id, encrypted_payload, iv, auth_tag, revision, updated_at) VALUES (?, ?, ?, ?, 1, ?)"),
      updateBackup: this.database.prepare("UPDATE user_backups SET encrypted_payload = ?, iv = ?, auth_tag = ?, revision = ?, updated_at = ? WHERE user_id = ? AND revision = ?"),
    };
  }

  createUser(user) {
    this.statements.createUser.run(user.id, user.email, user.salt, user.passwordHash, user.createdAt);
  }

  getUserByEmail(email) {
    return this.statements.userByEmail.get(email);
  }

  getUserById(id) {
    return this.statements.userById.get(id);
  }

  createSession(tokenHash, userId, expiresAt, createdAt) {
    this.statements.createSession.run(tokenHash, userId, expiresAt, createdAt);
  }

  getSessionUser(tokenHash, now = Date.now()) {
    return this.statements.sessionUser.get(tokenHash, now);
  }

  deleteSession(tokenHash) {
    this.statements.deleteSession.run(tokenHash);
  }

  deleteExpiredSessions(now = Date.now()) {
    this.statements.deleteExpiredSessions.run(now);
  }

  getBackup(userId) {
    return this.statements.backupByUser.get(userId);
  }

  saveBackup(userId, encrypted, expectedRevision, updatedAt) {
    const current = this.getBackup(userId);
    if (!current) {
      if (expectedRevision !== null) return { conflict: true, currentRevision: null };
      this.statements.insertBackup.run(userId, encrypted.payload, encrypted.iv, encrypted.authTag, updatedAt);
      return { conflict: false, revision: 1 };
    }
    if (expectedRevision !== current.revision) {
      return { conflict: true, currentRevision: current.revision };
    }
    const nextRevision = current.revision + 1;
    const result = this.statements.updateBackup.run(
      encrypted.payload, encrypted.iv, encrypted.authTag, nextRevision, updatedAt, userId, current.revision,
    );
    if (Number(result.changes) !== 1) return { conflict: true, currentRevision: this.getBackup(userId)?.revision ?? null };
    return { conflict: false, revision: nextRevision };
  }

  close() {
    this.database.close();
  }
}
